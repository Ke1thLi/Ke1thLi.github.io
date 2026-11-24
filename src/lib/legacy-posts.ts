interface LegacyPost {
  slug: string;
  fragments?: Record<string, string>;
}

// Slugs and heading IDs verified against the archived Hugo Pages artifact.
export const legacyPosts: Record<string, LegacyPost> = {
  "buuctf-reverse-wp1": { slug: "buuctf-reverse-wp1" },
  "算法笔记xorrc4-与-base64": { slug: "ctf-reverse-xor-rc4-base64" },
  "ctfshow-reverse-wp1": { slug: "ctfshow-reverse-wp1" },
  "为什么这个时代我们更需要学-markdown-从语法入门到-obsidian-知识管理实践": {
    slug: "markdown-obsidian",
  },
  红日attck系列靶场一: {
    slug: "redsunatt-1",
    fragments: { "1--mysql连接检测--弱口令爆破": "1-mysql连接检测--弱口令爆破" },
  },
  "ai-web-1.0-vulnhub靶场复现-重走来时路": { slug: "vulnhub-aiweb1-0" },
  "ai-web-2.0-vulunhub靶场复现-重走来时路4": { slug: "vulnhub-aiweb2-0" },
  "bossplayerctf-1-vulnhub靶场复现-重走来时路5": { slug: "vulnhub-bosscplayerctf1" },
  "bottleneck-1-vulnhub靶场复现-重走来时路6": { slug: "vulnhub-bottleneck" },
  "bossplayerctf-1-vulnhub靶场复现-重走来时路7": { slug: "vulnhub-bulldog" },
  "darkhole1.0-vulnhub靶场复现-重走来时路2": { slug: "vulnhub-darkhole1-0" },
  "darkhole2.0-vulnhub靶场复现": { slug: "vulnhub-darkhole2-0" },
  "dc-1-vulnhub靶场复现": { slug: "vulnhub-dc-1" },
  "five86-1-vulnhub靶场复现": { slug: "vulnhub-five86-1" },
  "necromancer-vulnhub靶场复现": { slug: "vulnhub-necromancer" },
  "prime1-vulnhub靶场复现": { slug: "vulnhub-prime1" },
  "sickos1.2-vulnhub靶场复现": { slug: "vulnhub-sickos1-2" },
  "skytower-vulnhub靶场复现-重走来时路3": { slug: "vulnhub-skytower" },
  "w1r3s-1.0.1-vulnhub靶场复现": { slug: "vulnhub-w1r3s-1-0-1" },
};
