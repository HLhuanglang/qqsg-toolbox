package service

import (
	"encoding/json"
	"fmt"
	"io/fs"

	"github.com/HLhuanglang/qqsg-toolbox/backend/entity"
)

type SoulService struct {
	fsys fs.FS
}

func NewSoulService(fsys fs.FS) *SoulService {
	return &SoulService{fsys: fsys}
}

// GetSoulCatalog 读取灵魂图鉴数据
func (s *SoulService) GetSoulCatalog() (*entity.SoulCatalogData, error) {
	data, err := fs.ReadFile(s.fsys, entity.SoulCatlogConfigPath)
	if err != nil {
		return nil, fmt.Errorf("读取 soul_catalog.json 失败: %w", err)
	}
	var catalog entity.SoulCatalogData
	if err := json.Unmarshal(data, &catalog); err != nil {
		return nil, fmt.Errorf("解析 soul_catalog.json 失败: %w", err)
	}
	return &catalog, nil
}

// GetSoulLevels 读取灵魂等级数据
func (s *SoulService) GetSoulLevels() ([]entity.SoulLevelRow, error) {
	data, err := fs.ReadFile(s.fsys, entity.SoulLevelConfigPath)
	if err != nil {
		return nil, fmt.Errorf("读取 levels.json 失败: %w", err)
	}
	var levels []entity.SoulLevelRow
	if err := json.Unmarshal(data, &levels); err != nil {
		return nil, fmt.Errorf("解析 levels.json 失败: %w", err)
	}
	return levels, nil
}

// GetSoulAwaken 读取开灵属性数据
func (s *SoulService) GetSoulAwaken() (*entity.SoulAwakenData, error) {
	data, err := fs.ReadFile(s.fsys, entity.SoulAkakenConfigPath)
	if err != nil {
		return nil, fmt.Errorf("读取 awaken.json 失败: %w", err)
	}
	var awaken entity.SoulAwakenData
	if err := json.Unmarshal(data, &awaken); err != nil {
		return nil, fmt.Errorf("解析 awaken.json 失败: %w", err)
	}
	return &awaken, nil
}
