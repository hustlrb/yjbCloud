/**
 * Created by wanpeng on 2017/10/11.
 */
import AV from 'leanengine'
import * as errno from '../errno'
import amqp from 'amqplib'
import Promise from 'bluebird'
import GLOBAL_CONFIG from '../../config'
import moment from 'moment'
import utilFunc from '../Util'

var Promotion = AV.Object.extend('Promotion')

function constructCategoryInfo(category) {
  if(!category) {
    return undefined
  }
  let categoryInfo = {}
  let categoryAttr = category.attributes
  if(!categoryAttr) {
    return undefined
  }
  categoryInfo.id = category.id
  categoryInfo.title = categoryAttr.title
  categoryInfo.description = categoryAttr.description
  categoryInfo.createdAt = category.createdAt

  return categoryInfo
}

function constructPromotionInfo(promotion, includeCategory, includeUser) {
  let constructUserInfo = require('../Auth').constructUserInfo

  if(!promotion) {
    return undefined
  }
  let promotionInfo = {}
  let promotionAttr = promotion.attributes
  if(!promotionAttr) {
    return undefined
  }
  promotionInfo.id = promotion.id
  promotionInfo.title = promotionAttr.title
  promotionInfo.description = promotionAttr.description
  promotionInfo.start = promotionAttr.start
  promotionInfo.end = promotionAttr.end
  promotionInfo.region = promotionAttr.region
  promotionInfo.disabled = promotionAttr.disabled
  promotionInfo.categoryId = promotionAttr.category.id
  promotionInfo.createdAt = promotion.createdAt
  promotionInfo.awards = promotionAttr.awards
  promotionInfo.userId = promotionAttr.user.id
  promotionInfo.stat = promotionAttr.stat
  if(includeCategory) {
    promotionInfo.category = constructCategoryInfo(promotionAttr.category)
  }
  if(includeUser) {
    promotionInfo.user = constructUserInfo(promotionAttr.user)
  }

  return promotionInfo
}

async function getCategoryTitle(categoryId) {
  if(!categoryId) {
    return undefined
  }

  let category = AV.Object.createWithoutData('PromotionCategory', categoryId)
  let leanCategory = await category.fetch()
  let title = leanCategory.attributes.title
  return title
}

/**
 * 新增营销活动
 * 详情请见：
 * Examples:
 * @param request
 */
async function createPromotion(request) {
  const {currentUser, params} = request
  if(!currentUser) {
    throw new AV.Cloud.Error('用户未登录', {code: errno.EPERM})
  }
  let title = params.title
  let start = params.start
  let end = params.end
  let description = params.description
  let categoryId = params.categoryId
  let region = [].concat(params.region)
  let awards = params.awards

  if(!categoryId || !title || !start || !end || !awards ) {
    throw new AV.Cloud.Error('参数错误', {code: errno.EINVAL})
  }

  // let isPromExist = await isPromotionExist(categoryId, start, end, region)
  // if(isPromExist) {
  //   throw new AV.Cloud.Error('重复的活动', {code: errno.ERROR_PROM_REPEAT})
  // }

  let promotion = new Promotion()
  let category = AV.Object.createWithoutData('PromotionCategory', categoryId)

  promotion.set('title', title)
  promotion.set('start', new Date(start))
  promotion.set('end', new Date(end))
  promotion.set('description', description)
  promotion.set('category', category)
  promotion.set('region', region)
  promotion.set('disabled', false)
  promotion.set('awards', awards)
  promotion.set('user', currentUser)

  let result = await promotion.save()
  let leanPromotion = await result.fetch()
  return constructPromotionInfo(leanPromotion, false, true)
}

/**
 * 编辑营销活动
 * @param request
 */
async function editPromotion(request) {
  const {currentUser, params} = request
  if(!currentUser) {
    throw new AV.Cloud.Error('用户未登录', {code: errno.EPERM})
  }
  let promotionId = params.promotionId
  if(!promotionId) {
    throw new AV.Cloud.Error('参数错误', {code: errno.EINVAL})
  }
  let title = params.title
  let start = params.start
  let end = params.end
  let description = params.description
  let region = [].concat(params.region)
  let awards = params.awards
  let disabled = params.disabled

  if(!title && !start && !end && !description && region.length == 0 && !awards && disabled === undefined) {
    throw new AV.Cloud.Error('参数错误', {code: errno.EINVAL})
  }
  let promotion = AV.Object.createWithoutData('Promotion', promotionId)
  if(!promotion) {
    throw new AV.Cloud.Error('没找到该活动对象', {code: errno.ENODATA})
  }
  let leanPromotion = await promotion.fetch()
  if(leanPromotion.attributes.user.id != currentUser.id) {
    throw new AV.Cloud.Error('该用户没有操作权限', {code: errno.EPERM})
  }
  if(title) {
    promotion.set('title', title)
  }
  if(start) {
    promotion.set('start', new Date(start))
  }
  if(end) {
    promotion.set('end', new Date(end))
  }
  if(description) {
    promotion.set('description', description)
  }
  if(region) {
    promotion.set('region', region)
  }
  if(awards) {
    promotion.set('awards', awards)
  }
  if(disabled != undefined) {
    promotion.set('disabled', disabled)
  }

  let result = await promotion.save()
  leanPromotion = await result.fetch()
  return constructPromotionInfo(leanPromotion, false, false)
}

/**
 * 获取营销活动类型列表
 * @param request
 */
async function fetchPromotionCategoryList(request) {
  const {currentUser, params} = request

  if(!currentUser) {
    throw new AV.Cloud.Error('用户未登录', {code: errno.EPERM})
  }
  let lastCreatedAt = undefined
  let categoryList = []
  let query = new AV.Query('PromotionCategory')
  query.descending('createdAt')
  while (1) {
    if(lastCreatedAt) {
      query.lessThan('createdAt', new Date(lastCreatedAt))
    }
    let categories = await query.find()
    if(categories.length < 1) {
      break
    }
    categories.forEach((category) => {
      categoryList.push(constructCategoryInfo(category))
    })
    lastCreatedAt = categories[categories.length - 1].createdAt.valueOf()
  }
  return categoryList
}

/**
 * 查询营销活动列表
 * 备注：无分页查询
 * Examples:
 * @param request
 * @param response
 */
async function fetchPromotions(request) {
  const {currentUser, params} = request

  if(!currentUser) {
    throw new AV.Cloud.Error('用户未登录', {code: errno.EPERM})
  }
  let disabled = params.disabled
  let start = params.start
  let end = params.end
  let lastCreatedAt = undefined
  let promotionList = []

  let query = new AV.Query('Promotion')
  query.descending('createdAt')
  query.include('category')
  query.include('user')

  if(disabled != undefined) {
    query.equalTo('disabled', disabled)
  }
  if(start) {
    query.greaterThanOrEqualTo('createdAt', new Date(start))
  }
  if(end) {
    query.lessThan('createdAt', new Date(end))
  }
  while (1) {
    if(lastCreatedAt) {
      query.lessThan('createdAt', new Date(lastCreatedAt))
    }
    let results = await query.find()
    if(results.length < 1) {
      break
    }
    results.forEach((promotion) => {
      promotionList.push(constructPromotionInfo(promotion, true, true))
    })
    lastCreatedAt = results[results.length - 1].createdAt.valueOf()
  }
  return promotionList
}
/**
 * 判断指定条件内的活动是否存在
 * 备注：同类型的活动在时间和空间上不能重叠
 * @param {String} categoryId  活动类型id
 * @param {String} start       活动开始时间
 * @param {String} end         活动结束时间
 * @param {Array}  region      活动区域
 */
async function isPromotionExist(categoryId, start, end, region) {
  if(!categoryId || !start || !end || !region) {
    return undefined
  }

  let startQuery = new AV.Query('Promotion')
  let endQuery = new AV.Query('Promotion')
  let regionQuery = new AV.Query('Promotion')
  let categoryQuery = new AV.Query('Promotion')
  let timeQuery = undefined

  let category = AV.Object.createWithoutData('PromotionCategory', categoryId)
  categoryQuery.equalTo('category', category)
  if(region.length === 1) {
    regionQuery.containedIn('region', region)
  } else if (region.length ===2) {

  } else {
    return undefined
  }

  let query = AV.Query.and(categoryQuery, regionQuery)
  let results = await query.find()
  console.log("results:", results)
  return results.length > 0? true : false
}
/**
 * 微信端用户查询有效活动
 * @param request
 */
async function getValidPromotion(request) {
  const {currentUser, params, meta} = request
  const remoteAddress = meta.remoteAddress
  if(!currentUser) {
    throw new AV.Cloud.Error('用户未登录', {code: errno.EPERM})
  }
  const {categoryId} = params
  if(!categoryId) {
    throw new AV.Cloud.Error('参数错误', {code: errno.EINVAL})
  }
  if(!remoteAddress) {
    throw new AV.Cloud.Error('获取用户ip失败', {code: errno.ERROR_PROM_NOIP})
  }

  let userAddrInfo = await utilFunc.getIpInfo(remoteAddress)
  let userRegion = [userAddrInfo.region_id, userAddrInfo.city_id]
  let categoryQuery = new AV.Query('Promotion')
  let timeQuery = new AV.Query('Promotion')
  let regionQueryA = new AV.Query('Promotion')
  let regionQueryB = new AV.Query('Promotion')
  let statusQuery = new AV.Query('Promotion')
  timeQuery.greaterThan('end', new Date())
  timeQuery.lessThanOrEqualTo('start', new Date())

  regionQueryA.containsAll('region', userRegion)
  regionQueryB.containedIn('region', userRegion)
  let regionQuery = AV.Query.or(regionQueryA, regionQueryB)

  statusQuery.equalTo('disabled', false)

  let query = AV.Query.and(categoryQuery, statusQuery, timeQuery, regionQuery)
  query.include('user')
  query.include('category')
  let validPromotion = await query.first()
  if(validPromotion) {
    return constructPromotionInfo(validPromotion, true, true)
  }
  return undefined
}

async function promotionFuncTest(request) {
  console.log("request:", request)
  const {currentUser, params, meta} = request
  console.log("meta:", meta)

  // let categoryId = params.categoryId
  // let start = params.categoryId
  // let end = params.end
  // let region = params.region
  // let result = await isPromotionExist(categoryId, start, end, region)
  // return result
  return true
}

var promotionFunc = {
  promotionFuncTest: promotionFuncTest,
  constructPromotionInfo: constructPromotionInfo,
  createPromotion: createPromotion,
  fetchPromotions: fetchPromotions,
  fetchPromotionCategoryList: fetchPromotionCategoryList,
  editPromotion: editPromotion,
  getValidPromotion: getValidPromotion,
}

module.exports = promotionFunc
