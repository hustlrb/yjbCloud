/**
 * Created by wanpeng on 2017/9/4.
 */
var Promise = require('bluebird')
var GLOBAL_CONFIG = require('../../config')
var wechat_api = require('../index').wechat_api

/**
 * 发送充值成功模版消息
 * @param {String} openid 用户openid
 * @param {Number} amount 充值金额
 * @param {Number} balance 用户余额
 * @param {Number} score 用户积分
 * @param {Date} payTime 充值时间
 */
function sendRechargeTmpMsg(openid, amount, balance, score, payTime) {
  var templateId = GLOBAL_CONFIG.WECHAT_MSG_TMPID_RECHARGE
  var url = GLOBAL_CONFIG.MP_CLIENT_DOMAIN + '/mine/wallet'

  var data = {
    "first": {
      "value":"尊敬的衣家宝用户，您已充值成功\n",
      "color":"#173177"
    },
    "keyword1": {
      "value": amount.toFixed(2) + '元',
      "color":"#173177"
    },
    "keyword2" : {
      "value": balance.toFixed(2) + '元',
      "color":"#173177"
    },
    "keyword3" : {
      "value": score + '分',
      "color":"#173177"
    },
    "keyword4" : {
      "value": payTime.toLocaleString(),
      "color":"#173177"
    },
    "remark":{
      "value":"\n如有问题请在衣家宝公众号内留言，小编将第一时间为您服务！",
      "color":"#173177"
    }
  }

  return new Promise((resolve, reject) => {
    wechat_api.sendTemplate(openid, templateId, url, data, function (err, result) {
      if(err) {
        console.log("sendRechargeTmpMsg", err)
        return reject()
      }
      return resolve()
    })
  })
}

/**
 * 发送订单支付模版消息
 * @param {String} openid 用户openid
 * @param {Number} amount 扣款金额
 * @param {String} orderId 订单ObjectId
 * @param {String} deviceAddr 订单设备地址
 */
function sendOrderPaymentTmpMsg(openid, amount, orderId, addr) {
  var templateId = GLOBAL_CONFIG.WECHAT_MSG_TMPID_PAYMENT
  var url = GLOBAL_CONFIG.MP_CLIENT_DOMAIN + '/mine/orders/:' + orderId

  var data = {
    "first": {
      "value":"尊敬的衣家宝用户，您已充值成功\n",
      "color":"#173177"
    },
    "orderMoneySum": {
      "value": amount.toFixed(2) + '元',
      "color":"#173177"
    },
    "orderProductName" : {
      "value": deviceAddr,
      "color":"#173177"
    },
    "remark":{
      "value":"\n如有问题请在衣家宝公众号内留言，小编将第一时间为您服务！",
      "color":"#173177"
    }
  }

  return new Promise((resolve, reject) => {
    wechat_api.sendTemplate(openid, templateId, url, data, function (err, result) {
      if(err) {
        console.log("sendOrderPaymentTmpMsg", err)
        return reject()
      }
      return resolve()
    })
  })
}

/**
 * 发送开锁成功模板消息
 * @param {String} openid 用户的openid
 * @param {Number} amount 打赏金额
 * @param {String} title 文章标题
 * @param {Date} created 打赏时间
 */
function sendTurnOnTmpMsg(openid ) {
  var templateId = GLOBAL_CONFIG.WECHAT_MSG_TMPID_TURNON
  var url = ""

  var data = {
    "first": {
      "value":"恭喜您收到新的打赏！\n",
      "color":"#173177"
    },
    // "keyword1": {
    //   "value": rewardArticle,
    //   "color":"#173177"
    // },
    // "keyword2" : {
    //   "value": rewardAmount,
    //   "color":"#173177"
    // },
    // "keyword3" : {
    //   "value": rewardTime,
    //   "color":"#173177"
    // },
    "remark":{
      "value":"\n如有问题请在衣家宝公众号内留言，小编将第一时间为您服务！",
      "color":"#173177"
    }
  }

  return new Promise((resolve, reject) => {
    wechat_api.sendTemplate(openid, templateId, url, data, function (err, result) {
      if(err) {
        console.log("sendTurnOnTmpMsg", err)
        return reject()
      }
      return resolve()
    })
  })
}

/**
 * 发送干衣结束模板消息
 * @param {String} openid 用户的openid
 * @param {String} orderId 订单ObjectId
 * @param {String} orderNo 订单编号
 * @param {Number} amount 订单金额
 * @param {String} deviceAddr 设备地址
 */
function sendFinishTmpMsg(openid, orderId, orderNo, amount, deviceAddr) {
  var templateId = GLOBAL_CONFIG.WECHAT_MSG_TMPID_FINISH
  var url = GLOBAL_CONFIG.MP_CLIENT_DOMAIN + '/mine/orders/:' + orderId

  var data = {
    "first": {
      "value":"您的衣物已经烘干完成，请尽快取出衣物完成支付！\n",
      "color":"#173177"
    },
    "keyword1": {   //订单编号
      "value": orderNo,
      "color":"#173177"
    },
    "keyword2" : {  //服务项目
      "value": deviceAddr,
      "color":"#173177"
    },
    "keyword3" : {  //订单金额
      "value": amount + '元',
      "color":"#173177"
    },
    "remark":{
      "value":"\n如有问题请在衣家宝公众号内留言，小编将第一时间为您服务！",
      "color":"#173177"
    }
  }

  return new Promise((resolve, reject) => {
    wechat_api.sendTemplate(openid, templateId, url, data, function (err, result) {
      if(err) {
        console.log("sendFinishTmpMsg", err)
        return reject()
      }
      return resolve()
    })
  })
}


function wechatMessageTest(request, response) {
  console.log("wechatMessageTest", request.params)
  var openid = request.params.openid
  var username = request.params.username
  var city = request.params.city

  // sendTurnOnTmpMsg(openid, username, city).then(() => {
  //   response.success({
  //
  //   })
  // }).catch((error) => {
  //   console.log("sendInviterTmpMsg", error)
  // })
}


var mpMsgFuncs = {
  sendRechargeTmpMsg: sendRechargeTmpMsg,
  sendTurnOnTmpMsg: sendTurnOnTmpMsg,
  sendOrderPaymentTmpMsg: sendOrderPaymentTmpMsg,
  sendFinishTmpMsg: sendFinishTmpMsg,
  wechatMessageTest: wechatMessageTest
}

module.exports = mpMsgFuncs