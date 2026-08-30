import { deleteImages, uploadImage } from "@/lib/post-api";
import { postFiles } from "@/lib/post-files";

export async function POST(request: Request, ctx: RouteContext<"/api/posts/[slug]/images">) {
  return uploadImage((await ctx.params).slug, request, postFiles);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/posts/[slug]/images">) {
  return deleteImages((await ctx.params).slug, request, postFiles);
}
