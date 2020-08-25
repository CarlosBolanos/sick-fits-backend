
const Mutations = {
    async createItem(parent, args, ctx, info) {
        const item = await ctx.db.mutation.createItem({ data: { ...args } }, info);
        return item;
    },
    async updateItem(parent, args, ctx, info){
        const updates = {...args};
        delete updates.id;

        return ctx.db.mutation.updateItem({ data: updates, where: {id: args.id} }, info);
    },
    async deleteItem(parent, args, ctx, info){
        console.log('f: deleteItem args', args);
        const where = {id: args.id};
        const item = await ctx.db.query.item({where}, info);
        return ctx.db.mutation.deleteItem({where}, info)
    }
};

module.exports = Mutations;
