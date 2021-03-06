const {
  getPostsByCategory, getSinglePost, getPostComments, getManyPosts,
} = require('utilities/operations').post;
const validators = require('controllers/validators');

exports.show = async (req, res, next) => {
  const value = validators.validate({
    author: req.params.author,
    permlink: req.params.permlink,
  }, validators.post.showSchema, next);

  if (!value) {
    return;
  }
  const { post, error } = await getSinglePost(value.author, value.permlink);

  if (error) {
    return next(error);
  }
  res.result = { status: 200, json: post };
  next();
};

exports.getByCategory = async (req, res, next) => {
  const value = validators.validate({
    category: req.body.category,
    limit: req.body.limit,
    skip: req.body.skip,
    user_languages: req.body.user_languages,
  }, validators.post.getPostsByCategorySchema, next);

  if (!value) {
    return;
  }
  const { posts, error } = await getPostsByCategory(value);

  if (error) {
    return next(error);
  }
  res.result = { status: 200, json: posts };
  next();
};

exports.getPostComments = async (req, res, next) => {
  const value = validators.validate({ ...req.query }, validators.post.getPostComments, next);

  if (!value) return;

  const { result, error } = await getPostComments(value);

  if (error) return next(error);

  res.result = { status: 200, json: result };
  next();
};

exports.getManyPosts = async (req, res, next) => {
  const value = validators.validate(req.body, validators.post.getManyPosts, next);

  if (!value) return;

  const { posts, error } = await getManyPosts(value);

  if (error) return next(error);

  res.result = { status: 200, json: posts };
  next();
};
