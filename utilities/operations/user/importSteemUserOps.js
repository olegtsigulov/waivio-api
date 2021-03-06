const _ = require('lodash');
const { User } = require('../../../models');
const { userUtil } = require('../../steemApi');

/**
 * Import full user info from STEEM to mongodb:
 * alias, profile_image, json_metadata, last_root_post, followers_count, followings(array)
 * @param userName {String}
 * @returns {Promise<{user: (Object)}|{error: (Object)}>} error or created(updated) user
 */
exports.importUser = async (userName) => {
  const { user: existUser, error: dbError } = await User.getOne(userName);

  if (dbError) console.error(dbError);
  if (_.get(existUser, 'stage_version') === 1) return { user: existUser };

  const {
    data: userData, error: steemError,
  } = await this.getUserSteemInfo(userName);

  if (steemError) return { error: steemError };

  await updateUserFollowings(userName);

  return User.updateOne(
    { name: userName },
    { ...userData, stage_version: 1 },
  );
};

/**
 * Get main info about user from STEEM
 * Return object with keys: name, alias, profile_image, json_metadata, last_root_post
 * @param name
 * @returns {Promise<{data: (Object)}|{error: (*|string)}>}
 */
exports.getUserSteemInfo = async (name) => {
  const { userData, error: steemError } = await userUtil.getAccount(name);
  if (steemError || !userData) return { error: steemError || `User ${name} not exist, can't import.` };

  const { result: followCountRes, error: followCountErr } = await userUtil.getFollowCount(name);
  if (followCountErr) return { error: followCountErr };

  const { count: guestFollCount, error: guestFollErr } = await User.getGuestFollowersCount(name);
  if (guestFollErr) return { error: guestFollErr };

  const data = {
    name,
    alias: _.get(parseString(userData.json_metadata), 'profile.name', ''),
    profile_image: _.get(parseString(userData.json_metadata), 'profile.profile_image', ''),
    json_metadata: userData.json_metadata,
    last_root_post: userData.last_root_post,
    followers_count: _.get(followCountRes, 'follower_count', 0) + guestFollCount,
  };

  return { data };
};

// PRIVATE METHODS //

/**
 * Update user following list from STEEM
 * This operation can take a lot of time execution
 * (up to 7-8 minutes if user follow around 900k users)
 * @param name
 * @returns {Promise<{ok: boolean}|{error: *}>}
 */
const updateUserFollowings = async (name) => {
  const batchSize = 1000;
  let currBatchSize = 0;
  let startAccount = '';

  do {
    const { followings = [], error } = await userUtil.getFollowingsList({
      name, startAccount, limit: batchSize,
    });

    if (error || followings.error) {
      console.error(error || followings.error);
      return { error: error || followings.error };
    }
    currBatchSize = followings.length;
    startAccount = _.get(followings, `[${batchSize - 1}].following`, '');
    await User.updateOne(
      { name }, { $addToSet: { users_follow: followings.map((f) => f.following) } },
    );
  } while (currBatchSize === batchSize);
  return { ok: true };
};

const parseString = (str) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return { error };
  }
};
