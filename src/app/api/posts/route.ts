import { createPost, listPosts } from "@/lib/post-api";
import { postFiles } from "@/lib/post-files";

export const GET = () => listPosts(postFiles);

export const POST = (request: Request) => createPost(request, postFiles);
