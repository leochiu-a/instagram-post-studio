import { createClient } from "@supabase/supabase-js";
import type { Post } from "./types";

/**
 * 資料庫的列。跟 Post 差在多了兩個時間欄位 ——
 * created_at 給清單排序、updated_at 純粹是紀錄，兩者都不進 Post。
 */
export type PostRow = Post & {
  created_at: string;
  updated_at: string;
};

type Empty = Record<string, never>;

interface Database {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: Partial<PostRow> & { id: string };
        Update: Partial<PostRow>;
        Relationships: [];
      };
    };
    Views: Empty;
    Functions: Empty;
    Enums: Empty;
    CompositeTypes: Empty;
  };
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "缺少 Supabase 設定。把 .env.example 複製成 .env.local，填入專案的 URL 與 anon key。",
  );
}

/**
 * 整個 app 只有這一個 client。資料都在瀏覽器端讀寫，
 * 所以不需要 server client —— 等接上 Auth 再談 @supabase/ssr。
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: { persistSession: false },
});

export const IMAGE_BUCKET = "post-images";
