import {
  BUTTON_TEXT_BY_LANG,
  GAME_TEXT_BY_LANG,
} from "@/constants/gameConstants";
import { useConfigurationSettings } from "@/contexts/Configuration";

/**
 * 現在の `language` 設定に対応する UI 文言辞書を返す。
 * 新規 UI 文字列を追加する際は `GAME_TEXT_BY_LANG` / `BUTTON_TEXT_BY_LANG`
 * の両言語を更新すること。
 */
export function useTexts() {
  const { language } = useConfigurationSettings();
  return {
    gameText: GAME_TEXT_BY_LANG[language],
    buttonText: BUTTON_TEXT_BY_LANG[language],
  };
}
