package main

import (
	"embed"

	"github.com/HLhuanglang/qqsg-toolbox/backend"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed all:data
var dataFS embed.FS

func main() {
	app := backend.NewApp(dataFS)
	err := wails.Run(&options.App{
		Title:  "qqsg-toolbox",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour:   &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:          app.Startup,
		Logger:             logger.NewDefaultLogger(),
		LogLevel:           logger.DEBUG,
		LogLevelProduction: logger.ERROR,
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
