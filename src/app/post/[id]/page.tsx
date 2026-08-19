import { PostEditor } from "@/components/post-editor";

export default async function PostPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  return <PostEditor postId={id} />;
}
