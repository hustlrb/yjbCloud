/**
 * Created by wanpeng on 2017/9/15.
 */
var Promise = require('bluebird')
var OperationLog = require('../OperationLog')
import AV from 'leanengine'
import * as errno from '../errno'
import * as authFuncs from '../Auth'
import {ROLE_CODE, PERMISSION_CODE} from '../../rolePermission'

const profitShareType = {
  PROFIT_SHARE_INVESTOR: 'investor',
  PROFIT_SHARE_PARTNER: 'partner',
}

//服务点
function constructStationInfo(station, includeAdmin) {
  if (!station) {
    return undefined
  }
  let constructUserInfo = require('../Auth').constructUserInfo
  let stationInfo = {}
  let stationAttr = station.attributes
  if (!stationAttr) {
    return undefined
  }

  let admin = stationAttr.admin
  stationInfo.id = station.id
  stationInfo.name = stationAttr.name
  stationInfo.addr = stationAttr.addr
  stationInfo.province = stationAttr.province
  stationInfo.city = stationAttr.city
  stationInfo.area = stationAttr.area
  stationInfo.unitPrice = stationAttr.unitPrice
  stationInfo.deposit = stationAttr.deposit
  stationInfo.powerUnitPrice = stationAttr.powerUnitPrice
  stationInfo.platformProp = stationAttr.platformProp
  stationInfo.stationProp = stationAttr.stationProp
  stationInfo.adminId = admin ? admin.id : undefined
  if (includeAdmin && admin) {
    stationInfo.admin = constructUserInfo(admin)
  }
  stationInfo.status = stationAttr.status
  stationInfo.deviceNo = stationAttr.deviceNo
  stationInfo.createdAt = station.createdAt
  stationInfo.updatedAt = station.updatedAt

  return stationInfo
}

function constructProfitSharing(profitSharing, includeUser, includeStation) {
  if (!profitSharing) {
    return undefined
  }
  let constructUserInfo = require('../Auth').constructUserInfo
  var profitSharingInfo = {}
  let profitSharingAttr = profitSharing.attributes
  if (!profitSharingAttr) {
    return undefined
  }
  var shareholder = profitSharingAttr.shareholder
  var station = profitSharingAttr.station
  profitSharingInfo.id = profitSharing.id
  profitSharingInfo.type = profitSharingAttr.type
  profitSharingInfo.royalty = profitSharingAttr.royalty
  profitSharingInfo.investment = profitSharingAttr.investment

  profitSharingInfo.shareholderId = shareholder ? shareholder.id : undefined
  profitSharingInfo.stationId = station ? station.id : undefined
  profitSharingInfo.status = profitSharingAttr.status
  profitSharingInfo.createdAt = profitSharing.createdAt
  profitSharingInfo.updatedAt = profitSharing.updatedAt
  if (includeUser && shareholder) {
    profitSharingInfo.shareholder = constructUserInfo(shareholder)
  }
  if (includeStation && station) {
    profitSharingInfo.station = constructStationInfo(station, false)
  }
  return profitSharingInfo
}

/**
 * 创建服务网点
 * @param {Object}  request
 * @param {Object}  response
 */
function createStation(request, response) {
  var currentUser = request.currentUser
  var name = request.params.name
  var addr = request.params.addr                      //详细地址
  var province = request.params.province              //省份
  var city = request.params.city                      //城市
  var area = request.params.area                      //区
  var adminId = request.params.adminId                //网点管理员userId
  var unitPrice = request.params.unitPrice            //设备使用单价，单位：元／分钟
  var deposit = request.params.deposit                //设备使用押金，单位：¥元
  var powerUnitPrice = request.params.powerUnitPrice  //电费单价，单位：元／KWh
  var platformProp = request.params.platformProp      //平台分成比例
  var stationProp = request.params.stationProp        //服务网点分成比例

  var query = new AV.Query('Station')
  query.equalTo('name', name)

  query.first().then((stationRecord) => {
    if (stationRecord) {
      response.error(new Error("服务网点名字重复"))
      return
    }
    var admin = AV.Object.createWithoutData('_User', adminId)
    var Station = AV.Object.extend('Station')
    var station = new Station()
    station.set('name', name)
    station.set('addr', addr)
    station.set('province', province)
    station.set('city', city)
    station.set('area', area)
    station.set('unitPrice', unitPrice)
    station.set('deposit', deposit)
    station.set('powerUnitPrice', powerUnitPrice)
    station.set('platformProp', platformProp)
    station.set('stationProp', stationProp)
    station.set('admin', admin)
    station.set('status', 1)

    station.save().then((leanStation) => {
      var query = new AV.Query('Station')
      query.include('admin')
      query.get(leanStation.id).then((stationInfo)=> {
        OperationLog.recordOperation(currentUser, '创建服务点' + stationInfo.attributes.name)
        response.success(constructStationInfo(stationInfo, true))
      })
    }).catch((error) => {
      console.log("createStation", error)
      response.error(error)
    })
  })
}

/**
 * 查询服务网点
 * @param {Object}  request
 * @param {Object}  response
 */

function fetchStations(request, response) {
  var province = request.params.province
  var city = request.params.city
  var area = request.params.area
  var name = request.params.name
  var limit = request.params.limit || 100
  var status = request.params.status
  var addr = request.params.addr
  var lastCreatedAt = request.params.lastCreatedAt
  var query = new AV.Query('Station')
  if (province) {
    query.equalTo('province.value', province)
  }
  if (city) {
    query.equalTo('city.value', city)
  }
  if (area) {
    query.equalTo('area.value', area)
  }
  if (name) {
    query.equalTo('name', name)
  }
  if (status != undefined) {
    query.equalTo('status', status)
  }
  if (addr) {
    query.equalTo('addr', addr)
  }
  if (lastCreatedAt) {
    query.lessThan('createdAt', lastCreatedAt)
  }
  query.limit(limit)
  query.include(['admin'])
  query.descending('createdDate')

  query.find().then((stationList)=> {
    var stations = []
    stationList.forEach((record)=> {
      var station = constructStationInfo(record, true)
      stations.push(station)
    })
    response.success(stations)
  }, (err)=> {
    response.error(err)
  })
}

/**
 * 更新服务网点信息
 * @param {Object}  request
 * @param {Object}  response
 */

function updateStation(request, response) {
  let currentUser = request.currentUser
  var stationId = request.params.stationId
  var status = request.params.status
  var name = request.params.name
  var addr = request.params.addr                      //详细地址
  var province = request.params.province              //省份
  var city = request.params.city                      //城市
  var area = request.params.area                      //区
  var adminId = request.params.adminId                //网点管理员userId
  var unitPrice = request.params.unitPrice            //设备使用单价，单位：元／分钟
  var deposit = request.params.deposit                //设备使用押金，单位：¥元
  var powerUnitPrice = request.params.powerUnitPrice  //电费单价，单位：元／KWh
  var platformProp = request.params.platformProp      //平台分成比例
  var stationProp = request.params.stationProp        //服务网点分成比例
  var admin = AV.Object.createWithoutData('_User', adminId)
  var station = AV.Object.createWithoutData('Station', stationId)
  let queryName = new AV.Query('Station')
  queryName.equalTo('name', name)
  queryName.first().then((stationRecord) => {
    if (stationRecord && stationRecord.id != stationId) {
      response.error(new Error("服务网点名字重复"))
      return
    }
    station.set('name', name)
    station.set('addr', addr)
    station.set('province', province)
    station.set('city', city)
    station.set('area', area)
    station.set('unitPrice', unitPrice)
    station.set('deposit', deposit)
    station.set('powerUnitPrice', powerUnitPrice)
    station.set('platformProp', platformProp)
    station.set('stationProp', stationProp)
    station.set('admin', admin)
    if (status != undefined) {
      station.set('status', status)
    }
    station.save().then((leanStation) => {
      var query = new AV.Query('Station')
      query.include('admin')
      query.get(leanStation.id).then((stationInfo)=> {
        OperationLog.recordOperation(currentUser, '更新服务点' + stationInfo.attributes.name)
        response.success(constructStationInfo(stationInfo, true))
      })
    }).catch((error) => {
      console.log("createStation", error)
      response.error(error)
    })
  })

}

/**
 * 拉取服务点下合作平台信息
 * @param {Object}  request
 * @param {Object}  response
 */

function fetchPartnerByStationId(request, response) {
  var stationId = request.params.stationId
  var station = AV.Object.createWithoutData('Station', stationId)
  var query = new AV.Query('ProfitSharing')
  query.equalTo('station', station)
  query.equalTo('type', profitShareType.PROFIT_SHARE_PARTNER)
  query.include(['station', 'shareholder'])
  query.descending('createdDate')
  query.find().then((sharings)=> {
    var sharingList = []
    sharings.forEach((sharing)=> {
      sharingList.push(constructProfitSharing(sharing, true, true))
    })
    response.success(sharingList)
  }, (err)=> {
    response.error(err)
  })
}

/**
 * 获取服务点下合作平台信息
 * @param {Object}  request
 * @param {Object}  response
 */

function getPartnerByStationId(stationId) {
  if (!stationId) {
    return undefined
  }
  var station = AV.Object.createWithoutData('Station', stationId)
  var query = new AV.Query('ProfitSharing')
  query.equalTo('station', station)
  query.equalTo('type', profitShareType.PROFIT_SHARE_PARTNER)
  query.equalTo('status', 1)
  query.include(['station', 'shareholder'])
  query.descending('createdDate')
  return query.find().then((sharings)=> {
    var sharingList = []
    // console.log('sharings====>',sharings.length)
    if (sharings && sharings.length > 0) {
      sharings.forEach((sharing)=> {
        // console.log('sharing====>', sharing)
        let sharingInfo = constructProfitSharing(sharing, true, false)
        sharingList.push(sharingInfo)
      })
    }
    // console.log('sharingList====>', sharingList)
    return sharingList
  }, (err)=> {
    throw err
  })
}


/**
 * 拉取投资人列表
 * @param {Object}  request
 * @param {Object}  response
 */

function fetchInvestorByStationId(request, response) {
  var stationId = request.params.stationId
  var status = request.params.status
  var mobilePhoneNumber = request.params.mobilePhoneNumber
  var station = undefined
  var limit = request.params.limit || 100
  var lastCreateTime = request.params.lastCreateTime

  var query = new AV.Query('ProfitSharing')
  query.limit(limit)
  if (stationId) {
    station = AV.Object.createWithoutData('Station', stationId)
    query.equalTo('station', station)
  }
  query.equalTo('type', profitShareType.PROFIT_SHARE_INVESTOR)
  if (status != undefined) {
    query.equalTo('status', status)
  }
  if (lastCreateTime) {
    query.lessThan('createdAt', lastCreateTime)
  }
  query.include(['station', 'shareholder'])
  query.descending('createdDate')
  if (mobilePhoneNumber) {
    var queryUser = new AV.Query('_User')
    queryUser.equalTo('mobilePhoneNumber', mobilePhoneNumber)
    queryUser.first().then((user)=> {

      if(!user){
        response.error('没有查到该用户')
      }
      query.equalTo('shareholder', user)
      query.find().then((sharings)=> {
        var sharingList = []
        sharings.forEach((sharing)=> {
          let sharingInfo = constructProfitSharing(sharing, true, true)
          sharingList.push(sharingInfo)
        })
        response.success(sharingList)
      }, (err)=> {
        response.error(err)
      })
    })
  } else {
    query.find().then((sharings)=> {
      var sharingList = []
      if (sharings && sharings.length > 0) {
        sharings.forEach((sharing)=> {
          // console.log('sharing===>', sharing.id)

          let sharingInfo = constructProfitSharing(sharing, true, false)
          sharingList.push(sharingInfo)
        })
      }
      response.success(sharingList)
    }, (err)=> {
      response.error(err)
    })
  }
}

/**
 * 获取服务点下投资人列表
 * @param {Object}  request
 * @param {Object}  response
 */

function getInvestorByStationId(stationId) {
  if (!stationId) {
    return undefined
  }
  var station = undefined
  var limit = 1000
  var query = new AV.Query('ProfitSharing')
  query.limit(limit)
  station = AV.Object.createWithoutData('Station', stationId)
  query.equalTo('station', station)
  query.equalTo('type', profitShareType.PROFIT_SHARE_INVESTOR)
  query.equalTo('status', 1)
  query.include(['station', 'shareholder'])
  query.descending('createdAt')
  return query.find().then((sharings)=> {
    var sharingList = []
    if (sharings && sharings.length > 0) {
      sharings.forEach((sharing)=> {
        // console.log('sharing===>', sharing.id)
        sharingList.push(constructProfitSharing(sharing, true, false))
      })
    }
    return sharingList
  }, (err)=> {
    throw err
  })

}

/**
 * 根据用户及投资的类型查询其所有投资信息
 * @param user      完整_User对象
 * @param type      取值为profitShareType
 * @returns {Array}
 */
async function getProfitSharingByUser(user, type) {
  let query = new AV.Query('ProfitSharing')
  query.equalTo('shareholder', user)
  query.equalTo('status', 1)
  query.equalTo('type', type)
  query.include('station')
  query.descending('createdAt')

  let profitSharings = []
  let result = await query.find()
  result.forEach((sharing) => {
    profitSharings.push(constructProfitSharing(sharing, false, true))
  })
  return profitSharings
}

/**
 * 根据投资类型查询投资信息的网络接口
 * @param request
 * @returns {Array}
 */
async function reqFetchProfitSharebyUser(request) {
  let currentUser = request.currentUser
  let type = request.params.type
  if (!currentUser) {
    throw new AV.Cloud.Error('User didn\'t login', {code: errno.EINVAL})
  }

  return getProfitSharingByUser(currentUser, type)
}

/**
 * 新建分成方信息
 * @param {Object}  request
 * @param {Object}  response
 */

async function createPartner(request, response) {
  let currentUser = request.currentUser
  try {
    let royalty = request.params.royalty
    let userId = request.params.userId
    let stationId = request.params.stationId
    let user = AV.Object.createWithoutData('_User', userId)
    let station = AV.Object.createWithoutData('Station', stationId)
    let query = new AV.Query('ProfitSharing')
    query.equalTo('station', station)
    query.equalTo('shareholder', user)
    query.equalTo('type', profitShareType.PROFIT_SHARE_PARTNER)
    let prePartner = await query.first()
    let status = request.params.status
    if (prePartner) {
      response.error(new Error('已经存在该分成方'))
      return
    }
    let Partner = AV.Object.extend('ProfitSharing')
    let partner = new Partner()
    partner.set('shareholder', user)
    partner.set('station', station)
    partner.set('royalty', royalty)
    partner.set('status', status)
    partner.set('type', profitShareType.PROFIT_SHARE_PARTNER)
    let newPartner = await partner.save()
    let queryNew = new AV.Query('ProfitSharing')
    queryNew.include(['station', 'shareholder'])
    let finPartner = await queryNew.get(newPartner.id)
    OperationLog.recordOperation(currentUser, '创建分成方' + finPartner.attributes.shareholder.attributes.idName)
    response.success(constructProfitSharing(finPartner, true, false))
  } catch (err) {
    response.error(err)
  }

}

/**
 * 更新分成方信息
 * @param {Object}  request
 * @param {Object}  response
 */

async function updatePartner(request, response) {
  let currentUser = request.currentUser
  try {
    let royalty = request.params.royalty
    let userId = request.params.userId
    let stationId = request.params.stationId
    let partnerId = request.params.partnerId
    let user = AV.Object.createWithoutData('_User', userId)
    let station = AV.Object.createWithoutData('Station', stationId)
    let status = request.params.status

    let partner = AV.Object.createWithoutData('ProfitSharing', partnerId)
    partner.set('shareholder', user)
    partner.set('station', station)
    partner.set('royalty', royalty)
    partner.set('status', status)
    partner.set('type', profitShareType.PROFIT_SHARE_PARTNER)
    let newPartner = await partner.save()
    let queryNew = new AV.Query('ProfitSharing')
    queryNew.include(['station', 'shareholder'])
    let finPartner = await queryNew.get(newPartner.id)
    OperationLog.recordOperation(currentUser, '更新分成方' + finPartner.attributes.shareholder.attributes.idName)
    response.success(constructProfitSharing(finPartner, true, false))
  } catch (err) {
    response.error(err)
  }

}

/**
 * 新建服务点投资人信息
 * @param {Object}  request
 * @param {Object}  response
 */

function createInvestor(request, response) {
  let currentUser = request.currentUser
  var stationId = request.params.stationId
  var userId = request.params.userId
  var investment = request.params.investment
  // var royalty = request.params.royalty
  var Investor = AV.Object.extend('ProfitSharing')
  var investor = new Investor()
  var station = AV.Object.createWithoutData('Station', stationId)
  var user = AV.Object.createWithoutData('_User', userId)
  var queryPre = new AV.Query('ProfitSharing')
  queryPre.equalTo('shareholder', user)
  queryPre.equalTo('station', station)
  queryPre.equalTo('type', profitShareType.PROFIT_SHARE_INVESTOR)
  queryPre.first().then((item)=> {
    if (item) {
      response.error({message:"该服务点已有该投资人!"})
    } else {
      investor.set('shareholder', user)
      investor.set('station', station)
      // investor.set('royalty', royalty)
      investor.set('investment', investment)
      investor.set('type', profitShareType.PROFIT_SHARE_INVESTOR)
      investor.set('status', 1)
      investor.save().then((item)=> {
        var queryStation = new AV.Query('Station')
        queryStation.get(stationId).then((stationInfo)=> {
          var investmentSum = stationInfo.attributes.investment
          investmentSum = investmentSum + investment
          station.set('investment', investmentSum)
          station.save().then(()=> {
            var query = new AV.Query('ProfitSharing')
            query.include(['shareholder', 'station', 'station.admin'])
            query.equalTo('station', station)
            query.equalTo('status', 1)
            query.equalTo('type', profitShareType.PROFIT_SHARE_INVESTOR)
            query.find().then((sharings)=> {
              var shareList = []
              sharings.forEach((share)=> {
                var shareInfo = AV.Object.createWithoutData('ProfitSharing', share.id)
                var royalty = Math.round(share.attributes.investment / investmentSum * 100) / 100.00
                shareInfo.set('royalty', royalty)
                shareList.push(shareInfo)
              })
              AV.Object.saveAll(shareList).then(()=> {
                query.find().then((results)=> {
                  if (results && results.length > 0) {
                    var investors = []
                    results.forEach((result)=> {
                      investors.push(constructProfitSharing(result))
                    })
                    OperationLog.recordOperation(currentUser, '创建投资人')
                    response.success(investors)
                  }
                })
              })
            }, (err)=> {
              response.error(err)
            })
          })
        })
      }, (err)=> {
        response.error(err)
      })
    }
  }, (err)=> {
    response.error(err)
  })
}

/**
 * 更新服务点投资人信息
 * @param {Object}  request
 * @param {Object}  response
 */

function updateInvestor(request, response) {
  let currentUser = request.currentUser
  var investorId = request.params.investorId
  var stationId = request.params.stationId
  var userId = request.params.userId
  var investment = request.params.investment
  // var royalty = request.params.royalty
  var status = request.params.status
  var investor = AV.Object.createWithoutData('ProfitSharing', investorId)
  var station = AV.Object.createWithoutData('Station', stationId)
  var user = AV.Object.createWithoutData('_User', userId)
  var queryShare = new AV.Query('ProfitSharing')
  queryShare.get(investorId).then((record)=> {
    var preInvestment = record.attributes.investment
    investor.set('shareholder', user)
    investor.set('station', station)
    // investor.set('royalty', royalty)
    investor.set('investment', investment)
    investor.set('type', profitShareType.PROFIT_SHARE_INVESTOR)
    if (status != undefined) {
      investor.set('status', status)
    }
    investor.save().then((item)=> {
      var queryStation = new AV.Query('Station')
      queryStation.get(stationId).then((stationInfo)=> {
        var investmentSum = stationInfo.attributes.investment
        if (stationInfo.attributes.status == 1) {
          investmentSum = investmentSum + investment - preInvestment
          station.set('investment', investmentSum)
        }
        station.save().then(()=> {
          var query = new AV.Query('ProfitSharing')
          query.include(['shareholder', 'station', 'station.admin'])
          query.equalTo('station', station)
          query.equalTo('status', 1)
          query.equalTo('type', profitShareType.PROFIT_SHARE_INVESTOR)
          query.find().then((sharings)=> {
            var shareList = []
            sharings.forEach((share)=> {
              var shareInfo = AV.Object.createWithoutData('ProfitSharing', share.id)
              var royalty = Math.round(share.attributes.investment / investmentSum * 100) / 100.00
              shareInfo.set('royalty', royalty)
              shareList.push(shareInfo)
            })
            AV.Object.saveAll(shareList).then(()=> {
              query.find().then((results)=> {
                if (results && results.length > 0) {
                  var investors = []
                  results.forEach((result)=> {
                    investors.push(constructProfitSharing(result))
                  })
                  OperationLog.recordOperation(currentUser, '更新投资人')
                  response.success(investors)
                } else {
                  response.success()
                }
              })
            })
          }, (err)=> {
            response.error(err)
          })
        })
      })
    }, (err)=> {
      response.error(err)
    })
  })
}

/**
 * 启用服务点
 * @param {Object}  request
 * @param {Object}  response
 */

function openStation(request, response) {
  let currentUser = request.currentUser
  var stationId = request.params.stationId
  var station = AV.Object.createWithoutData('Station', stationId)
  station.set('status', 1)
  station.save().then((item)=> {
    var query = new AV.Query('Station')
    query.include(['admin'])
    query.get(item.id).then((result)=> {
      OperationLog.recordOperation(currentUser, '启用服务点' + result.attributes.name)
      response.success(constructStationInfo(result, true))
    }, (err)=> {
      response.error(err)
    })
  }, (err)=> {
    response.error(err)
  })
}

/**
 * 启用分成方
 * @param {Object}  request
 * @param {Object}  response
 */

function openPartner(request, response) {
  let currentUser = request.currentUser
  var partnerId = request.params.partnerId
  var partner = AV.Object.createWithoutData('ProfitSharing', partnerId)
  partner.set('status', 1)
  partner.save().then((item)=> {
    var query = new AV.Query('ProfitSharing')
    query.include(['station', 'shareholder'])
    query.get(item.id).then((result)=> {
      OperationLog.recordOperation(currentUser, '启用分成方' + result.attributes.shareholder.attributes.idName)
      response.success(constructProfitSharing(result))
    }, (err)=> {
      response.error(err)
    })
  }, (err)=> {
    response.error(err)
  })
}

/**
 * 禁用分成方
 * @param {Object}  request
 * @param {Object}  response
 */

function closePartner(request, response) {
  let currentUser = request.currentUser
  var partnerId = request.params.partnerId
  var partner = AV.Object.createWithoutData('ProfitSharing', partnerId)
  partner.set('status', 0)
  partner.save().then((item)=> {
    var query = new AV.Query('ProfitSharing')
    query.include(['station', 'shareholder'])
    query.get(item.id).then((result)=> {
      OperationLog.recordOperation(currentUser, '禁用分成方' + result.attributes.shareholder.attributes.idName)
      response.success(constructProfitSharing(result))
    }, (err)=> {
      response.error(err)
    })
  }, (err)=> {
    response.error(err)
  })
}

/**
 * 启用投资人
 * @param {Object}  request
 * @param {Object}  response
 */

function openInvestor(request, response) {
  let currentUser = request.currentUser
  var investorId = request.params.investorId
  var investor = AV.Object.createWithoutData('ProfitSharing', investorId)
  var queryShare = new AV.Query('ProfitSharing')
  queryShare.get(investorId).then((record)=> {
    var preInvestment = record.attributes.investment
    // console.log('record========>',record.attributes.station)
    var station = AV.Object.createWithoutData('Station', record.attributes.station.id)
    if (record.attributes.status == 1) {
      response.error({message: '该投资人已经被启用'})
      return
    }
    investor.set('status', 1)
    investor.save().then((item)=> {
      var queryStation = new AV.Query('Station')
      queryStation.get(record.attributes.station.id).then((stationInfo)=> {
        var investmentSum = stationInfo.attributes.investment
        investmentSum = investmentSum + preInvestment
        station.set('investment', investmentSum)
        station.save().then(()=> {
          var query = new AV.Query('ProfitSharing')
          query.include(['shareholder', 'station', 'station.admin'])
          query.equalTo('station', station)
          query.equalTo('status', 1)
          query.equalTo('type', profitShareType.PROFIT_SHARE_INVESTOR)
          query.find().then((sharings)=> {
            var shareList = []
            sharings.forEach((share)=> {
              var shareInfo = AV.Object.createWithoutData('ProfitSharing', share.id)
              var royalty = Math.round(share.attributes.investment / investmentSum * 100) / 100.00
              shareInfo.set('royalty', royalty)
              shareList.push(shareInfo)
            })
            AV.Object.saveAll(shareList).then(()=> {
              query.find().then((results)=> {
                if (results && results.length > 0) {
                  var investors = []
                  results.forEach((result)=> {
                    investors.push(constructProfitSharing(result))
                  })
                  OperationLog.recordOperation(currentUser, '启用投资人')
                  response.success(investors)
                } else {
                  response.success()
                }
              })
            })
          }, (err)=> {
            response.error(err)
          })
        })
      })
    }, (err)=> {
      response.error(err)
    })
  })
}

/**
 * 禁用投资人
 * @param {Object}  request
 * @param {Object}  response
 */

function closeInvestor(request, response) {
  let currentUser = request.currentUser
  var investorId = request.params.investorId
  // var stationId = request.params.stationId
  // var royalty = request.params.royalty
  var investor = AV.Object.createWithoutData('ProfitSharing', investorId)
  var queryShare = new AV.Query('ProfitSharing')
  queryShare.get(investorId).then((record)=> {
    var preInvestment = record.attributes.investment
    // console.log('record========>',record.attributes.station)
    var station = AV.Object.createWithoutData('Station', record.attributes.station.id)
    if (record.attributes.status == 0) {
      response.error({message: '该投资人已经被禁用'})
      return
    }
    investor.set('status', 0)
    investor.set('royalty', 0)
    investor.save().then((item)=> {
      var queryStation = new AV.Query('Station')
      queryStation.get(record.attributes.station.id).then((stationInfo)=> {
        var investmentSum = stationInfo.attributes.investment
        investmentSum = investmentSum - preInvestment
        station.set('investment', investmentSum)
        station.save().then(()=> {
          var query = new AV.Query('ProfitSharing')
          query.include(['shareholder', 'station', 'station.admin'])
          query.equalTo('station', station)
          query.equalTo('status', 1)
          query.equalTo('type', profitShareType.PROFIT_SHARE_INVESTOR)
          query.find().then((sharings)=> {
            var shareList = []
            sharings.forEach((share)=> {
              var shareInfo = AV.Object.createWithoutData('ProfitSharing', share.id)
              var royalty = Math.round(share.attributes.investment / investmentSum * 100) / 100.00
              shareInfo.set('royalty', royalty)
              shareList.push(shareInfo)
            })
            AV.Object.saveAll(shareList).then(()=> {
              query.find().then((results)=> {
                if (results && results.length > 0) {
                  var investors = []
                  results.forEach((result)=> {
                    investors.push(constructProfitSharing(result))
                  })
                  OperationLog.recordOperation(currentUser, '停用投资人')
                  response.success(investors)
                } else {
                  response.success()
                }

              })
            })
          }, (err)=> {
            response.error(err)
          })
        })
      })
    }, (err)=> {
      response.error(err)
    })
  })
}

function closeStation(request, response) {
  let currentUser = request.currentUser
  if (!currentUser) {
    response.error('not login')
  }
  authFuncs.authValidPermissions(currentUser.id, [PERMISSION_CODE.STATION_EDIT_WHOLE, PERMISSION_CODE.STATION_EDIT_PART]).then((isValid)=> {
    if (!isValid) {
      response.error('no permission')
    }
    var stationId = request.params.stationId
    var station = AV.Object.createWithoutData('Station', stationId)
    station.set('status', 0)
    station.save().then((item)=> {
      var query = new AV.Query('Station')
      query.include(['admin'])
      query.get(item.id).then((result)=> {
        OperationLog.recordOperation(currentUser, '关闭服务点' + result.attributes.name)
        response.success(constructStationInfo(result, true))
      }, (err)=> {
        response.error(err)
      })
    }, (err)=> {
      response.error(err)
    })
  })
}
/**
 * 通过设备编号获取服务网点信息
 * @param {String}  deviceNo
 */
function getStationInfoByDeviceNo(deviceNo) {
  let query = new AV.Query('Device')
  query.equalTo('deviceNo', deviceNo)
  query.include('station')
  return query.find().then((results) => {
    if (results.length != 1) {
      return undefined
    }
    let device = results[0]
    let station = device.attributes.station
    if (!station) {
      return undefined
    }
    let stationId = station.id
    var query = new AV.Query('Station')
    query.include('admin')
    return query.get(stationId)
  }).then((station) => {
    return constructStationInfo(station, true)
  }).catch((error) => {
    console.error(error)
    throw error
  })
}

function userFuncTest(request, response) {

  var query = new AV.Query('_User')
  query.find().then((results)=> {
    var userList = []
    results.forEach((item)=> {
      userList.push({
        id: item.id,
        nickname: item.attributes.nickname
      })
    })
    response.success(userList)
  }, (err)=> {
    response.error(err)
  })
}


/**
 * 查询服务点列表
 * @param {String}  stationId
 */
async function getStations(lastCreatdAt) {
  let query = new AV.Query('Station')
  query.descending('createdAt')
  let stationList = []

  try {
    if (lastCreatdAt) {
      query.lessThan('createdAt', new Date(lastCreatdAt))
    }
    let devices = await query.find()
    devices.forEach((device) => {
      stationList.push(constructStationInfo(device, false))
    })
    return stationList
  } catch (error) {
    console.log("getDevices", error)
    throw error
  }
}

/**
 * 增加服务点设备数量
 * @param {String}  stationId
 * @param {String}  type = 'add' or 'sub'
 */
async function changeDeviceNum(stationId, type) {
  let station = AV.Object.createWithoutData('Station', stationId)
  if (type == 'add') {
    station.increment('deviceNo', 1)
  } else if (type == 'sub') {
    station.increment('deviceNo', -1)
  } else {
    throw error
  }
  try {
    let stationInfo = await station.save()
    return stationInfo
  } catch (error) {
    throw error
  }
}

function stationFuncTest(request, response) {
  let stationId = request.params.stationId

  response.success(changeDeviceNum(stationId, 'sub'))
}

var stationFunc = {
  constructStationInfo: constructStationInfo,
  constructProfitSharing: constructProfitSharing,
  createStation: createStation,
  fetchStations: fetchStations,
  updateStation: updateStation,
  openStation: openStation,
  closeStation: closeStation,
  fetchPartnerByStationId: fetchPartnerByStationId,
  fetchInvestorByStationId: fetchInvestorByStationId,
  createInvestor: createInvestor,
  updateInvestor: updateInvestor,
  getStationInfoByDeviceNo: getStationInfoByDeviceNo,
  closeInvestor: closeInvestor,
  openInvestor: openInvestor,
  createPartner: createPartner,
  updatePartner: updatePartner,
  openPartner: openPartner,
  closePartner: closePartner,
  userFuncTest: userFuncTest,
  getStations: getStations,
  getPartnerByStationId: getPartnerByStationId,
  getInvestorByStationId: getInvestorByStationId,
  changeDeviceNum: changeDeviceNum,
  stationFuncTest: stationFuncTest,
  reqFetchProfitSharebyUser,
}

module.exports = stationFunc
