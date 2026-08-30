/**
 * 對自己那幾個 route handler 發 request。
 *
 * 唯一的重點是把「HTTP 200 但其實失敗了」變成丟例外：route 把錯誤放在
 * body 的 error 欄位，這裡拆出來當 Error 的訊息，呼叫端才有東西可以顯示。
 */
export async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
