package entity

// DataFileInfo 描述 data/ 下一个 JSON 文件的元信息。
// Path 使用斜杠分隔的相对路径，例如 "soul/levels.json"。
type DataFileInfo struct {
	Path string `json:"path"`
	Size int64  `json:"size"`
}
