// Chuyển động của panel chỉ để báo đổi trạng thái. Người dùng bật "giảm chuyển động" của Windows thì mọi thời lượng về 0.
export const reduced = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Thời lượng ms, hoặc 0 khi người dùng muốn giảm chuyển động. */
export const ms = (n: number): number => (reduced() ? 0 : n)

/** Hai nấc thời lượng, đúng --dur-micro và --dur-short trong tokens.css. */
export const DUR_MICRO = 120
export const DUR_SHORT = 220
