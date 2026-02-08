export const ERROR_MESSAGES: Record<string, string> = {
  ERR_UNAUTHORIZED: "未授权或令牌无效",
  ERR_NOT_FOUND: "未找到相关记录",
  ERR_BAD_REQUEST: "请求参数错误",
  ERR_CONFLICT: "记录已存在",
  ERR_INTERNAL: "服务器内部错误",
  ERR_LOTTERY_FULL: "抽奖人数已满",
  ERR_LOTTERY_ENDED: "抽奖已结束",
  ERR_LOTTERY_NOT_ACTIVE: "抽奖活动未开始或已结束",
  ERR_TOKEN_INVALID: "编辑令牌无效或已过期",
};

export function getErrorMessage(error: any): string {
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  // Fallback to error message from backend if available, or default
  return error?.message || "发生未知错误";
}
