"use client";

import { ScaleContinuum } from "./ScaleContinuum";
import type { SurveyItem } from "./types";

type Props = {
  item: SurveyItem;
  value?: { current?: number; importance?: number; text?: string };
  onChange: (itemId: string, axis: "current" | "importance", v: number) => void;
  onText: (text: string) => void;
  subscaleName?: string | null;
};

export function QuestionFocus({ item, value, onChange, onText, subscaleName }: Props) {
  if (item.scaleType === "OPEN_TEXT") {
    return (
      <div className="dx-q">
        {subscaleName && <p className="dx-q__sub">{subscaleName}</p>}
        <h2 className="dx-q__stem">{item.textKo}</h2>
        <p className="dx-q__tip">자유롭게 적어 주세요. 건너뛰어도 됩니다.</p>
        <textarea
          className="dx-textarea"
          placeholder="생각을 남겨 주세요…"
          value={value?.text ?? ""}
          onChange={(e) => onText(e.target.value)}
          rows={5}
        />
      </div>
    );
  }

  const labels = item.scaleLabels ?? ["1", "2", "3", "4", "5"];

  return (
    <div className="dx-q">
      {subscaleName && <p className="dx-q__sub">{subscaleName}</p>}
      <h2 className="dx-q__stem">{item.textKo}</h2>

      <div className="dx-q__axis">
        <div className="dx-q__axis-label">
          <span className="dx-pill dx-pill--cur">현재 수준</span>
          <span className="dx-q__axis-hint">지금 실제로 느끼는 정도</span>
        </div>
        <ScaleContinuum
          labels={labels}
          selected={value?.current}
          onSelect={(v) => onChange(item.id, "current", v)}
          tone="current"
        />
      </div>

      {item.hasImportanceAxis && (
        <div className="dx-q__axis dx-q__axis--imp">
          <div className="dx-q__axis-label">
            <span className="dx-pill dx-pill--imp">중요도</span>
            <span className="dx-q__axis-hint">조직 발전에 얼마나 중요한지</span>
          </div>
          <ScaleContinuum
            labels={["전혀 중요하지 않다", "중요하지 않다", "보통이다", "중요하다", "매우 중요하다"]}
            selected={value?.importance}
            onSelect={(v) => onChange(item.id, "importance", v)}
            tone="importance"
          />
        </div>
      )}
    </div>
  );
}
