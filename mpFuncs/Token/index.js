/**
 * Created by wanpeng on 2017/8/9.
 */
var redis = require('redis');
var Promise = require('bluebird')
var GLOBAL_CONFIG = require('../../config')
var mysqlUtil = require('../../cloudFuncs/Util/mysqlUtil')


const PREFIX = 'wechatApiToken'


function getApiTokenFromRedis(callback) {
  Promise.promisifyAll(redis.RedisClient.prototype)
  var client = redis.createClient(GLOBAL_CONFIG.REDIS_PORT, GLOBAL_CONFIG.REDIS_URL)
  client.auth(GLOBAL_CONFIG.REDIS_AUTH)
  client.select(GLOBAL_CONFIG.REDIS_DB)
  // 建议增加 client 的 on error 事件处理，否则可能因为网络波动或 redis server
  // 主从切换等原因造成短暂不可用导致应用进程退出。
  client.on('error', function (err) {
    response.error({errcode: 1, message: '设置费率失败，请重试！'})
  })

  client.getAsync(PREFIX).then((token) => {
    callback(null, JSON.parse(token))
  }).finally(() => {
    client.quit()
  })
}

function setApiTokenToRedis(token, callback) {
  Promise.promisifyAll(redis.RedisClient.prototype)
  var client = redis.createClient(GLOBAL_CONFIG.REDIS_PORT, GLOBAL_CONFIG.REDIS_URL)
  client.auth(GLOBAL_CONFIG.REDIS_AUTH)
  client.select(GLOBAL_CONFIG.REDIS_DB)
  // 建议增加 client 的 on error 事件处理，否则可能因为网络波动或 redis server
  // 主从切换等原因造成短暂不可用导致应用进程退出。
  client.on('error', function (err) {
    response.error({errcode: 1, message: '设置费率失败，请重试！'})
  })

  client.setAsync(PREFIX, JSON.stringify(token)).then(() => {
    callback()
  }).finally(() => {
    client.quit()
  })
}

function getOauthTokenFromMysql(openid, callback) {
  var sql = ""
  var mysqlConn = undefined

  mysqlUtil.getConnection().then((conn) => {
    mysqlConn = conn
    sql = 'SELECT * FROM token WHERE openid = ?'
    return mysqlUtil.query(conn, sql, [openid])
  }).then((queryRes) => {
    callback(null, queryRes.results[0])
  }).catch((error) => {
    callback(error)
  }).finally(() => {
    if (mysqlConn) {
      mysqlUtil.release(mysqlConn)
    }
  })
}

function setOauthTokenToMysql(openid, token, callback) {
  var sql = ""
  var mysqlConn = undefined

  mysqlUtil.getConnection().then((conn) => {
    mysqlConn = conn
    sql = 'REPLACE INTO token(access_token, expires_in, refresh_token, openid, scope, create_at) VALUES(?, ?, ?, ?, ?, ?)';
    var fields = [token.access_token, token.expires_in, token.refresh_token, token.openid, token.scope, token.create_at];
    return mysqlUtil.query(conn, sql, fields)
  }).then(() => {
    callback()
  }).catch((error) => {
    callback(error)
  }).finally(() => {
    if (mysqlConn) {
      mysqlUtil.release(mysqlConn)
    }
  })
}

function getTicketTokenToRedis(type, callback) {
  Promise.promisifyAll(redis.RedisClient.prototype)
  var client = redis.createClient(GLOBAL_CONFIG.REDIS_PORT, GLOBAL_CONFIG.REDIS_URL)
  client.auth(GLOBAL_CONFIG.REDIS_AUTH)
  client.select(GLOBAL_CONFIG.REDIS_DB)
  // 建议增加 client 的 on error 事件处理，否则可能因为网络波动或 redis server
  // 主从切换等原因造成短暂不可用导致应用进程退出。
  client.on('error', function (err) {
    response.error({errcode: 1, message: '设置费率失败，请重试！'})
  })

  client.getAsync('wechatJsSdkTicket:' + type).then((value) => {
    callback(null, JSON.parse(value))
  }).catch((error) => {
    console.log("getTicketToken", error)
    callback(error)
  }).finally(() => {
    client.quit()
  })
}

function saveTicketTokenFromRedis(type, ticketToken, callback) {
  Promise.promisifyAll(redis.RedisClient.prototype)
  var client = redis.createClient(GLOBAL_CONFIG.REDIS_PORT, GLOBAL_CONFIG.REDIS_URL)
  client.auth(GLOBAL_CONFIG.REDIS_AUTH)
  client.select(GLOBAL_CONFIG.REDIS_DB)
  // 建议增加 client 的 on error 事件处理，否则可能因为网络波动或 redis server
  // 主从切换等原因造成短暂不可用导致应用进程退出。
  client.on('error', function (err) {
    response.error({errcode: 1, message: '设置费率失败，请重试！'})
  })

  client.setAsync('wechatJsSdkTicket:' + type, JSON.stringify(ticketToken)).then(() => {
    callback(null)
  }).catch((error) => {
    console.log("saveTicketToken", error)
    callback(error)
  }).finally(() => {
    client.quit()
  })
}

var mpTokenFuncs = {
  getApiTokenFromRedis: getApiTokenFromRedis,
  setApiTokenToRedis: setApiTokenToRedis,
  getOauthTokenFromMysql: getOauthTokenFromMysql,
  setOauthTokenToMysql: setOauthTokenToMysql,
  getTicketToken: getTicketTokenToRedis,
  saveTicketToken: saveTicketTokenFromRedis,
}

module.exports = mpTokenFuncs