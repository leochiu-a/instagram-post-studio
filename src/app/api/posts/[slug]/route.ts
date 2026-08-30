import { deletePost, savePost } from "@/lib/post-api";
import { postFiles } from "@/lib/post-files";

export async function PUT(request: Request, ctx: RouteContext<"/api/posts/[slug]">) {
  return savePost((await ctx.params).slug, request, postFiles);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/posts/[slug]">) {
  return deletePost((await ctx.params).slug, postFiles);
}
