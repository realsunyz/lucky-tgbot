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
  ERR_RATE_LIMITED: "请求过于频繁",
  ERR_REQUEST_TIMEOUT: "请求超时",
};

export const VALIDATION_ERRORS = {
  INVALID_CREATE_LINK: "无效的创建链接",
  TITLE_REQUIRED: "请填写抽奖名称",
  PRIZE_NAME_REQUIRED: "请填写奖品名称",
  DRAW_TIME_REQUIRED: "请选择开奖时间",
  DRAW_TIME_PAST: "开奖时间不得早于当前时间",
  ENTRIES_INVALID: "无效的满人数量",
  TOS_REQUIRED: "请阅读并同意服务条款",
  TITLE_TOO_LONG: (max: number) => `抽奖标题不得超过 ${max} 字`,
  DESC_TOO_LONG: (max: number) => `抽奖详情不得超过 ${max} 字`,
  PRIZE_TITLE_TOO_LONG: (max: number) => `奖品名称不得超过 ${max} 字`,
  PRIZE_QTY_EXCEED: (max: number) => `奖品数量不得超过 ${max} 个`,
  PRIZE_COUNT_EXCEED: (max: number) => `最多添加 ${max} 个奖品`,
  DRAW_TIME_FUTURE_LIMIT: (days: number) => `开奖时间不得晚于 ${days} 天后`,
  ENTRIES_EXCEED: (max: number) => `最高人数不得超过 ${max} 人`,
};

export const UI_MESSAGES = {
  LOAD_FAILED_TITLE: "加载失败",
  INVALID_EDIT_TOKEN: "无效的编辑令牌",
  INVALID_LOTTERY_ID: "无效的抽奖 ID",
  NOT_PUBLISHED_TITLE: "抽奖未发布",
  NOT_PUBLISHED_WAIT_DESC: "请等待创建者发布该抽奖",
};

export const SUCCESS_MESSAGES = {
  CREATE_SUCCESS: "抽奖创建成功",
};

export function getErrorMessage(error: any): string {
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }
  return error?.message || "发生未知错误";
}
