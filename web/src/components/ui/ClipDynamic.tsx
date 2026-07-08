import type { ElementType, ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** 툴팁용 전체 문자열 — 생략 시 children이 string이면 자동 사용 */
  title?: string;
  className?: string;
  as?: ElementType;
};

/** 동적 사용자 입력·기관명 등 — 한 줄 말줄임 + title 툴팁 */
export function ClipDynamic({ children, title, className = "", as: Tag = "span" }: Props) {
  const autoTitle = typeof children === "string" ? children : undefined;
  const tip = title ?? autoTitle;
  return (
    <Tag className={`clip-dynamic ${className}`.trim()} title={tip}>
      {children}
    </Tag>
  );
}
