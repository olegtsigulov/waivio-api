const { User } = require( '../models' );
const { userFeedHelper, generalSearchHelper } = require( '../utilities/helpers' );
const { getManyUsers, objectsShares, getOneUser } = require( '../utilities/operations/user' );
const validators = require( './validators' );

const index = async function ( req, res, next ) {
    const value = validators.validate(
        {
            limit: req.query.limit,
            skip: req.query.skip,
            sample: req.query.sample
        }, validators.user.indexSchema, next );

    if( !value ) {
        return ;
    }
    const { users, error } = await getManyUsers.getUsers( value );

    if ( error ) {
        return next( error );
    }
    res.result = { status: 200, json: users };
    next();
};

const show = async function ( req, res, next ) {
    const value = validators.validate( req.params.userName, validators.user.showSchema, next );
    const { userData, error } = await getOneUser.getOne( value );

    if ( error ) {
        return next( error );
    }
    res.result = { status: 200, json: userData };
    next();
};

const objects_follow = async function ( req, res, next ) {
    const value = validators.validate( {
        name: req.params.userName,
        locale: req.body.locale,
        limit: req.body.limit,
        skip: req.body.skip
    }, validators.user.objectsFollowSchema, next );

    if( !value ) {
        return ;
    }
    const { wobjects, error } = await User.getObjectsFollow( value );

    if ( error ) {
        return next( error );
    }
    res.result = { status: 200, json: wobjects };
    next();
};

const objects_feed = async function ( req, res, next ) {
    const value = validators.validate( {
        user: req.params.userName,
        skip: req.body.skip,
        limit: req.body.limit
    }, validators.user.objectsFeedSchema, next );

    if( !value ) {
        return ;
    }
    const { posts, error } = await userFeedHelper.feedByObjects( value );

    if ( error ) {
        return next( error );
    }
    res.result = { status: 200, json: posts };
    next();
};

const feed = async function ( req, res, next ) {
    const value = validators.validate( {
        user: req.params.userName,
        limit: req.body.limit,
        count_with_wobj: req.body.count_with_wobj,
        start_author: req.body.start_author,
        start_permlink: req.body.start_permlink,
        filter: req.body.filter
    }, validators.user.feedSchema, next );

    if( !value ) {
        return ;
    }
    const { result, error } = await userFeedHelper.getCombinedFeed( value );

    if ( error ) {
        return next( error );
    }
    res.result = { status: 200, json: result };
    next();
};

const userObjectsShares = async function( req, res, next ) {

    const value = validators.validate(
        {
            name: req.params.userName,
            limit: req.body.limit,
            skip: req.body.skip,
            locale: req.body.locale,
            exclude_object_types: req.body.exclude_object_types,
            object_types: req.body.object_types
        }, validators.user.objectsSharesSchema, next );

    if( !value ) {
        return ;
    }

    const { objects_shares, error } = await objectsShares.getUserObjectsShares( value );

    if( error ) {
        return next( error );
    }
    res.result = { status: 200, json: objects_shares };
    next();
};

const generalSearch = async function( req, res, next ) {
    const value = validators.validate( {
        searchString: req.body.string,
        userLimit: req.body.userLimit,
        wobjectsLimit: req.body.wobjectsLimit,
        objectsTypeLimit: req.body.objectsTypeLimit
    }, validators.user.generalSearchSchema, next );

    if( !value ) {
        return ;
    }
    const result = await generalSearchHelper.search( value );

    res.result = { status: 200, json: result };
    next();
};

module.exports = { index, show, objects_follow, objects_feed, feed, userObjectsShares, generalSearch };
