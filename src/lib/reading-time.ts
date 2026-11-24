export function readingMinutes(body = "") {
  let fence = "";
  const prose = body
    .split(/\r?\n/)
    .filter((line) => {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (
          marker &&
          marker[1][0] === fence[0] &&
          marker[1].length >= fence.length &&
          !marker[2].trim()
        )
          fence = "";
        return false;
      }
      if (marker) {
        fence = marker[1];
        return false;
      }
      return !/^( {4}|\t)/.test(line);
    })
    .join(" ");
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  const characters = prose.match(cjk)?.length ?? 0;
  const words = prose.replace(cjk, " ").match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(characters / 400 + words / 220));
}
