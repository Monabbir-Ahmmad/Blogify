import { Op, Sequelize } from "sequelize";

import { Blog } from "../../../models/blog.model.js";
import { BlogPostReqDto } from "../../../dtos/request/blogPost.req.dto.js";
import { BlogUpdateReqDto } from "../../../dtos/request/blogUpdate.req.dto.js";
import { Comment } from "../../../models/comment.model.js";
import { Like } from "../../../models/like.model.js";
import { User } from "../../../models/user.model.js";

/**
 * @category Repositories
 * @subcategory Database
 * @classdesc A class that provides blog-related database operations.
 */
export class BlogDB {
  /**
   * Creates a new blog post.
   * @param {string|number} userId - The ID of the user creating the blog post.
   * @param {BlogPostReqDto} blogPostReqDto - The blog post request data.
   * @returns {Promise<Blog|null>} A promise that resolves to the created blog post or null if unsuccessful.
   */
  async createBlog(userId, blogPostReqDto) {
    const blog = await Blog.create({ ...blogPostReqDto, userId });

    if (!blog) return null;

    await blog.reload({
      include: [
        {
          model: User,
          attributes: ["id", "name", "profileImage"],
        },
        {
          model: Like,
          attributes: ["userId"],
          required: false,
        },
      ],
    });

    return blog;
  }

  /**
   * Retrieves a blog post by its ID.
   * @param {string|number} blogId - The ID of the blog post.
   * @returns {Promise<Blog|null>} A promise that resolves to the retrieved blog post or null if not found.
   */
  async getBlogById(blogId) {
    const blog = await Blog.findByPk(blogId, {
      attributes: [
        "id",
        "title",
        "content",
        "coverImage",
        "createdAt",
        "updatedAt",
        [Sequelize.fn("COUNT", Sequelize.col("comments.id")), "commentCount"],
      ],
      include: [
        {
          model: User,
          attributes: ["id", "name", "profileImage"],
        },
        {
          model: Like,
          attributes: ["userId"],
          required: false,
        },
        {
          model: Comment,
          attributes: [],
          required: false,
          where: { parentId: null },
        },
      ],
    });

    if (!blog?.id) return null;

    return blog;
  }

  /**
   * Retrieves a list of blogs with pagination support.
   * @param {number} offset - The offset for pagination.
   * @param {number} limit - The maximum number of blogs to retrieve.
   * @returns {Promise<{pageCount: number, blogs: Blog[]}>} A promise that resolves to an object containing the page count and the retrieved blogs.
   */
  async getBlogs(offset, limit) {
    const { rows: blogs, count } = await Blog.findAndCountAll({
      subQuery: false,
      group: ["Blog.id"],
      offset,
      limit,
      attributes: [
        "id",
        "title",
        "content",
        "coverImage",
        "createdAt",
        "updatedAt",
        [Sequelize.fn("COUNT", Sequelize.col("comments.id")), "commentCount"],
      ],
      include: [
        {
          model: User,
          attributes: ["id", "name", "profileImage"],
        },
        {
          model: Like,
          attributes: ["userId"],
          required: false,
        },
        {
          model: Comment,
          attributes: [],
          required: false,
          where: { parentId: null },
        },
      ],
    });

    return {
      pageCount: Math.ceil(count.length / limit),
      blogs,
    };
  }

  /**
   * Retrieves a list of blogs by a specific user with pagination support.
   * @param {string|number} userId - The ID of the user.
   * @param {number} offset - The offset for pagination.
   * @param {number} limit - The maximum number of blogs to retrieve.
   * @returns {Promise<{pageCount: number, blogs: Blog[]}>} A promise that resolves to an object containing the page count and the retrieved blogs.
   */
  async getUserBlogs(userId, offset, limit) {
    const { rows: blogs, count } = await Blog.findAndCountAll({
      where: { userId },
      subQuery: false,
      group: ["Blog.id"],
      offset,
      limit,
      attributes: [
        "id",
        "title",
        "content",
        "coverImage",
        "createdAt",
        "updatedAt",
        [Sequelize.fn("COUNT", Sequelize.col("comments.id")), "commentCount"],
      ],
      include: [
        {
          model: User,
          attributes: ["id", "name", "profileImage"],
        },
        {
          model: Like,
          attributes: ["userId"],
          required: false,
        },
        {
          model: Comment,
          attributes: [],
          required: false,
          where: { parentId: null },
        },
      ],
    });

    return {
      pageCount: Math.ceil(count.length / limit),
      blogs,
    };
  }

  /**
   * Updates a blog post.
   * @param {string|number} blogId - The ID of the blog post to update.
   * @param {BlogUpdateReqDto} blogUpdateReqDto - The blog post update request data.
   * @returns {Promise<Blog|null>} A promise that resolves to the updated blog post or null if not found.
   */
  async updateBlog(blogId, blogUpdateReqDto) {
    const blog = await getBlogById(blogId);

    if (!blog) return null;

    await blog.update(blogUpdateReqDto);

    return blog;
  }

  /**
   * Deletes a blog post.
   * @param {string|number} blogId - The ID of the blog post to delete.
   * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful, or false otherwise.
   */
  async deleteBlog(blogId) {
    const blog = await getBlogById(blogId);

    if (!blog) return false;

    await blog.destroy();

    return true;
  }

  /**
   * Updates the like status of a blog post.
   * @param {string|number} userId - The ID of the user.
   * @param {string|number} blogId - The ID of the blog post.
   * @returns {Promise<boolean>} A promise that resolves to true if a new like was created, or false if the like was removed.
   */
  async updateBlogLike(userId, blogId) {
    const [like, created] = await Like.findOrCreate({
      where: { userId, blogId },
      defaults: { userId, blogId },
    });

    if (!created && like) await like.destroy();

    return created;
  }

  /**
   * Searches for blogs by title with pagination support.
   * @param {string} keyword - The keyword to search for in blog titles.
   * @param {number} offset - The offset for pagination.
   * @param {number} limit - The maximum number of blogs to retrieve.
   * @returns {Promise<{pageCount: number, blogs: Blog[]}>} A promise that resolves to an object containing the page count and the retrieved blogs.
   */
  async searchBlogByTitle(keyword, offset, limit) {
    const { rows: blogs, count } = await Blog.findAndCountAll({
      where: { title: { [Op.substring]: keyword } },
      subQuery: false,
      group: ["Blog.id"],
      offset,
      limit,
      attributes: [
        "id",
        "title",
        "content",
        "coverImage",
        "createdAt",
        "updatedAt",
        [Sequelize.fn("COUNT", Sequelize.col("comments.id")), "commentCount"],
      ],

      include: [
        {
          model: User,
          attributes: ["id", "name", "profileImage"],
        },
        {
          model: Like,
          attributes: ["userId"],
          required: false,
        },
        {
          model: Comment,
          attributes: [],
          required: false,
          where: { parentId: null },
        },
      ],
    });

    return {
      pageCount: Math.ceil(count.length / limit),
      blogs,
    };
  }
}

export const blogDB = new BlogDB();
