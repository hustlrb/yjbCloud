var AV = require('leanengine');

async function fetchUser(req) {
  const currentUser = req.currentUser;
  console.log('fetchUser currentUser: ', currentUser);
  return {};
}

async function createUser(req) {
  return {};
}

async function deleteUser(req) {
  return {};
}

async function updateUser(req) {
  return {};
}

const userApi = {
  fetchUser,
  createUser,
  deleteUser,
  updateUser,
};

module.exports = userApi;
