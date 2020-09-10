const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promesify, promisify } = require("util");

const Mutations = {
  async createItem(parent, args, ctx, info) {
    const item = await ctx.db.mutation.createItem({ data: { ...args } }, info);
    return item;
  },
  async updateItem(parent, args, ctx, info) {
    const updates = { ...args };
    delete updates.id;

    return ctx.db.mutation.updateItem(
      { data: updates, where: { id: args.id } },
      info
    );
  },
  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    const item = await ctx.db.query.item({ where }, info);
    return ctx.db.mutation.deleteItem({ where }, info);
  },
  async signup(parent, args, ctx, info) {
    args.email = args.email.toLowerCase();
    const password = await bcrypt.hash(args.password, 10);

    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ["USER"] },
        },
      },
      info
    );

    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);

    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 356,
    });

    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    const user = await ctx.db.query.user(
      { where: { email } },
      `{
            id
            name
            email
            password
        }`
    );

    if (user) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("f: isValidPassword", isValidPassword);
      if (isValidPassword) {
        const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
        ctx.response.cookie("token", token, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 356,
        });

        return user;
      }
      throw new Error(`incorrect password, please try again`);
    }

    throw new Error(`no such user found for email ${email}`);
  },
  async signout(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
  },
  async requestReset(parent, { email }, ctx, info) {
    const user = await ctx.db.query.user({ where: { email } }, info);

    if (user) {
      const resetToken = (await promisify(randomBytes)(20)).toString("hex");
      const resetTokenExpiry = Date.now() + 60 * 60 * 1000;
      const res = ctx.db.mutation.updateUser({
        where: { email },
        data: { resetToken, resetTokenExpiry },
      });
      return { statusCode: 1, message: "User password reset in progress" };
    }

    throw new Error("No user found");
  },
  async resetPassword(
    parent,
    { resetToken, password, passwordConfirm },
    ctx,
    info
  ) {
    console.log("f: resetPassword", resetToken, password, passwordConfirm);

    const [user] = await ctx.db.query.users({
      where: {
        resetToken,
        resetTokenExpiry_gte: Date.now() - 60 * 60 * 1000,
      },
    });
    console.log("f: user", user);

    if (!user) {
      throw new Error("Invalid/Expired token, please try again!");
      return;
    }

    if (password !== passwordConfirm) {
      throw new Error("Invalid Passwords!");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await ctx.db.mutation.updateUser(
      {
        where: { email: user.email },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      },
      info
    );

    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);

    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 356,
    });

    return updatedUser;
  },
};

module.exports = Mutations;
