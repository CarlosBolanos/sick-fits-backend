const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Mutations = {
    async createItem(parent, args, ctx, info) {
        const item = await ctx.db.mutation.createItem({ data: { ...args } }, info);
        return item;
    },
    async updateItem(parent, args, ctx, info) {
        const updates = { ...args };
        delete updates.id;

        return ctx.db.mutation.updateItem({ data: updates, where: { id: args.id } }, info);
    },
    async deleteItem(parent, args, ctx, info) {
        const where = { id: args.id };
        const item = await ctx.db.query.item({ where }, info);
        return ctx.db.mutation.deleteItem({ where }, info)
    },
    async signup(parent, args, ctx, info) {
        args.email = args.email.toLowerCase();
        const password = await bcrypt.hash(args.password, 10);

        const user = await ctx.db.mutation.createUser({
            data: {
                ...args,
                password,
                permissions: { set: ['USER'] }
            }
        }, info);

        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

        ctx.response.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 356
        })

        return user;
    },
    async signin(parent, { email, password }, ctx, info) {
        const user = await ctx.db.query.user({ where: { email } }, info);

        if (user) {
            const isValidPassword = await bcrypt.compare(password, user.password);

            if (isValidPassword) {
                const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
                ctx.response.cookie('token', token, {
                    httpOnly: true,
                    maxAge: 1000 * 60 * 60 * 24 * 356
                });

                return user;
            }
            throw new Error(`incorrect password, please try again`);
        }

        throw new Error(`no such user found for email ${email}`);
    },
    async signout(parent, args, ctx, info) {
        ctx.response.clearCookie('token');
    }
};

module.exports = Mutations;
