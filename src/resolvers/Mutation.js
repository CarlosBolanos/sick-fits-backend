const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { hasPermission } = require("../utils");
const { makeEmail, transport } = require("../mailer/mail");
const { connect } = require("http2");

const Mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("user is not logged in");
    }
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          ...args,
          user: {
            connect: { id: ctx.request.userId },
          },
        },
      },
      info
    );
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
    ctx.response.clearCookie("token");
    const user = await ctx.db.query.user(
      { where: { email } },
      `{ 
        id
        email
      }`
    );

    if (user) {
      const resetToken = (await promisify(randomBytes)(20)).toString("hex");
      const resetTokenExpiry = Date.now() + 60 * 60 * 1000;
      const res = ctx.db.mutation.updateUser({
        where: { email },
        data: { resetToken, resetTokenExpiry },
      });

      const emailData = {
        from: "mail@carlos-bolanos.com",
        to: user.email,
        subject: "Password reset request",
        html: makeEmail(
          `<a href="${
            process.env.FRONTEND_URL
          }/password/reset?resetToken=${resetToken}">Your password reset token is here! </a>`
        ),
      };

      const mailRes = await transport.sendMail(emailData);

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
    const [user] = await ctx.db.query.users({
      where: {
        resetToken,
        resetTokenExpiry_gte: Date.now() - 60 * 60 * 1000,
      },
    });

    if (!user) {
      throw new Error("Invalid/Expired token, please try again!");
      return {
        statusCode: 2,
        message: "Invalid/Expired token, please try again!",
      };
    }

    if (password !== passwordConfirm) {
      throw new Error("Invalid Passwords!");
      return { statusCode: 3, message: "Passwords dont match" };
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
  async updatePermissions(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("user is not logged in");
    }

    if (hasPermission(ctx.request.user, ["ADMIN", "PERMISSION_UPDATE"])) {
      const { permissions, userId } = args;
      console.log("f: permissions", permissions);
      console.log("f: userId", userId);
      return ctx.db.mutation.updateUser(
        {
          data: {
            permissions: {
              set: permissions,
            },
          },
          where: {
            id: userId,
          },
        },
        info
      );
    }
  },
};

module.exports = Mutations;
