"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * 스크롤에 따라 서서히 나타나는 연출(award-winning 사이트들의 "kinetic" 등장 효과 참고).
 * 서버 컴포넌트인 페이지들이 framer-motion을 직접 쓸 수 없어서(클라이언트 전용) 이
 * 작은 클라이언트 래퍼로 감싸 쓴다. 콘텐츠 자체는 그대로 서버에서 렌더링되고,
 * 등장 애니메이션만 클라이언트에서 처리된다.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
