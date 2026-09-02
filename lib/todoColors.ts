import type { TodoColor } from "./types";

/** 파스텔 톤 색상 값. 다이얼로그의 선택 스와치와 카드의 색상 표시에 함께 쓴다. */
export const TODO_COLOR_HEX: Record<TodoColor, string> = {
  none: "transparent",
  red: "#FFADAD",
  orange: "#FFD6A5",
  yellow: "#FDFFB6",
  green: "#CAFFBF",
  teal: "#9BF6FF",
  blue: "#A0C4FF",
  purple: "#BDB2FF",
  pink: "#FFC6FF",
};

/** 카드 배경용 연한 톤. 왼쪽 띠(TODO_COLOR_HEX)보다 옅게 만들어 띠 색이 도드라지게 한다. */
export const TODO_COLOR_BG_HEX: Record<TodoColor, string> = {
  none: "transparent",
  red: "#FFF3F3",
  orange: "#FFF5EC",
  yellow: "#FFFDE9",
  green: "#EEFDEC",
  teal: "#EAFDFF",
  blue: "#EEF3FF",
  purple: "#F3F1FF",
  pink: "#FFF2FF",
};

export const TODO_COLOR_LABELS: Record<TodoColor, string> = {
  none: "없음",
  red: "레드",
  orange: "오렌지",
  yellow: "옐로우",
  green: "그린",
  teal: "틸",
  blue: "블루",
  purple: "퍼플",
  pink: "핑크",
};
