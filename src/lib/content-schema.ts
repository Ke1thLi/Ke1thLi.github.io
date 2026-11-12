import { z } from "astro/zod";

const text = z.string().trim().min(1);
export const contentId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  message: "Use lowercase letters, digits, and single hyphens between segments",
});

export const categorySchema = contentId;
export const postTypeSchema = contentId;
export type Category = z.infer<typeof categorySchema>;
export type PostType = z.infer<typeof postTypeSchema>;

const date = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })])
  .transform((value) => new Date(value));
const httpUrl = z.url({ protocol: /^https?$/, hostname: /.+/ });
const featured = z.boolean().default(false);
const language = text
  .transform((value, context) => {
    try {
      return new Intl.Locale(value).baseName;
    } catch {
      context.addIssue({
        code: "custom",
        message: "Use a BCP 47 language tag, such as en or zh-CN",
      });
      return z.NEVER;
    }
  })
  .optional();

export const postSchema = z
  .strictObject({
    title: text,
    description: text,
    slug: contentId,
    pubDate: date,
    updatedDate: date.optional(),
    category: categorySchema.optional(),
    type: postTypeSchema,
    tags: z.array(text).default([]),
    projects: z.array(contentId).default([]),
    draft: z.boolean().default(false),
    featured,
    cover: text.optional(),
    lang: language,
  })
  .refine(({ pubDate, updatedDate }) => !updatedDate || updatedDate >= pubDate, {
    path: ["updatedDate"],
    message: "updatedDate must be on or after pubDate",
  });

export const projectSchema = z.strictObject({
  title: text,
  description: text,
  status: contentId,
  techStack: z.array(text).default([]),
  repository: httpUrl.optional(),
  demo: httpUrl.optional(),
  featured,
  lang: language,
});
