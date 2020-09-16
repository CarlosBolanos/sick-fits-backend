const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../utils");
const Query = {
  items: forwardTo("db"),
  itemsConnection: forwardTo("db"),
  item: forwardTo("db"),
  me(parent, args, ctx, info) {
    if (ctx.request.userId) {
      const { userId } = ctx.request;
      return ctx.db.query.user({ where: { id: userId } }, info);
    }

    return null;
  },
  users(parent, args, ctx, info) {
    if (ctx.request.userId) {
      if (hasPermission(ctx.request.user, ["ADMIN", "PERMISSIONUPDATE"])) {
        return ctx.db.query.users({}, info);
      }
    }

    return [];
  },
};

module.exports = Query;
