const moduleExports = {};

moduleExports.checkUserFollowings = require('./users/checkFollowings').checkUserFollowings;
moduleExports.fillPostAdditionalInfo = require('./posts/fillAdditionalInfo').fillPostAdditionalInfo;
moduleExports.moderateWobjects = require('./wobject/moderation').moderateWobjects;

module.exports = moduleExports;
