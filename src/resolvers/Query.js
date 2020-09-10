const { forwardTo } = require('prisma-binding');

const Query = {
    users: forwardTo('db'),
    items: forwardTo('db'),
    itemsConnection: forwardTo('db'),
    item: forwardTo('db'),
    me(parent, args, ctx, info) {
        if (ctx.request.userId) {
            const { userId } = ctx.request;
            return ctx.db.query.user({ where: { id: userId } }, info);
        }

        return null;
    }
};

module.exports = Query;
