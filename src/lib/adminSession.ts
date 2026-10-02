const KEY = 'admin_pw'

/** 管理画面のパスワードをタブの間だけ保持する（/admin と /admin/game で入力し直さなくてよいように） */
export function getAdminPassword(): string {
  try { return sessionStorage.getItem(KEY) ?? '' } catch { return '' }
}

export function setAdminPassword(pw: string): void {
  try { sessionStorage.setItem(KEY, pw) } catch { /* ignore */ }
}

export function clearAdminPassword(): void {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}
