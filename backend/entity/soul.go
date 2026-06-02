package entity

// ─── 灵魂图鉴数据类型 ───

type SoulCategory struct {
	Key   string   `json:"key"`
	Label string   `json:"label"`
	Slots []string `json:"slots"`
}

type SoulEffectSet struct {
	Base  string `json:"base"`
	Adv20 string `json:"adv20,omitempty"`
	Adv30 string `json:"adv30,omitempty"`
}

type SoulGreenEffect struct {
	Base string `json:"base"`
}

type SoulEffects struct {
	Green  SoulGreenEffect `json:"green,omitempty"`
	Blue   SoulEffectSet   `json:"blue,omitempty"`
	Purple SoulEffectSet   `json:"purple,omitempty"`
}

type SoulEntry struct {
	Name     string      `json:"name"`
	Desc     string      `json:"desc"`
	Category string      `json:"category"`
	Effects  SoulEffects `json:"effects"`
}

type SoulCatalogData struct {
	Categories []SoulCategory `json:"categories"`
	Souls      []SoulEntry    `json:"souls"`
}

// ─── 灵魂等级数据类型 ───

type SoulLevelRow struct {
	Level int `json:"level"`
	Exp   int `json:"exp"`
	Green int `json:"green"`
}

// ─── 开灵属性数据类型 ───

type SoulAwakenCategory struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

type SoulAwakenQuality struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

type SoulAwakenAttr struct {
	Desc string `json:"desc"`
	Rate string `json:"rate"`
	Need int    `json:"need"`
}

type SoulAwakenData struct {
	Categories []SoulAwakenCategory                   `json:"categories"`
	Qualities  []SoulAwakenQuality                    `json:"qualities"`
	Attributes map[string]map[string][]SoulAwakenAttr `json:"attributes"`
}
