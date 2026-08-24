# Windows Task Scheduler Generator

A React TypeScript application that generates XML configurations and import scripts for Windows Task Scheduler. Perfect for creating scheduled tasks on Windows 10+ with PowerShell 7+.

## Features

- 🌐 **Multi-language Support**: 14 languages including Chinese (Simplified & Traditional), English, Japanese, Korean, Thai, Indonesian, Arabic, German, Dutch, Spanish, Portuguese, French, and Russian
- 📅 **Multiple Trigger Types**: Daily, weekly, monthly, once, on startup, on logon, on idle
- ⚡ **XML Import Scripts**: Generates complete PowerShell scripts that create temporary XML files and import them as scheduled tasks
- 📋 **XML Export**: Download task configurations as XML files for manual import
- 🔧 **Advanced Settings**: Configure privileges, power management, restart policies
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎯 **Intuitive UI**: Clean, modern interface with collapsible output sections
- 📈 **Usage tracking**: XML downloads are recorded in Cloudflare D1 (`cronwin-stats.downloads`); page views use the dedicated GA4 property `wincron` (`G-X9SWY9XJQQ` / `G-CEFCKBHQ59` / `G-SL4XBKRQ0Y` by hostname)

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Windows 10+ (for task execution)
- PowerShell 7+ (for command execution)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd windows-task-scheduler-generator

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Serve production build locally
npm install -g serve
serve -s build
```

## Usage

1. **Configure Task**: Fill in task details including name, description, trigger type, and action
2. **Set Advanced Options**: Configure user account, privileges, and restart policies
3. **Generate Scripts**: Get XML import script and XML configuration
4. **Execute**:
   - Copy the XML import script to clipboard and run it in PowerShell (as Administrator)
   - OR download the XML file and import it manually using Task Scheduler

### Task Configuration Options

#### Basic Information
- **Task Name**: Unique identifier for your task
- **Description**: Detailed task description
- **Enabled**: Enable/disable the task

#### Trigger Types
- **Daily**: Run every X days at specified time
- **Weekly**: Run on specific weekdays
- **Monthly**: Run on specific days of specific months
- **Once**: Run once at specified date/time
- **On Startup**: Run when system starts
- **On Logon**: Run when user logs on
- **On Idle**: Run when system is idle

#### Actions
- **Start Program**: Launch any executable with arguments
- **Send Email**: Send email notifications (placeholder configuration)
- **Display Message**: Show popup messages

#### Advanced Settings
- **Run As**: SYSTEM, current user, or administrator
- **Highest Privileges**: Run with administrative rights
- **Hidden Task**: Hide task from Task Scheduler UI
- **Power Management**: Wake computer, run on battery
- **Restart Policy**: Retry on failure with configurable intervals

## Internationalization

The application supports 14 languages. Use the language switcher in the header to change the interface language.

- **Default Language**: English (auto-detects browser language; falls back to English if unavailable)
- **Available Languages**:
  - Chinese Simplified (简体中文) - `zh-CN`
  - Chinese Traditional (繁體中文) - `zh-TW`
  - English - `en-US`
  - Japanese (日本語) - `ja-JP`
  - Korean (한국어) - `ko-KR`
  - Thai (ไทย) - `th-TH`
  - Indonesian (Bahasa Indonesia) - `id-ID`
  - Arabic (العربية) - `ar-SA`
  - German (Deutsch) - `de-DE`
  - Dutch (Nederlands) - `nl-NL`
  - Spanish (Español) - `es-ES`
  - Portuguese (Português) - `pt-PT`
  - French (Français) - `fr-FR`
  - Russian (Русский) - `ru-RU`
- **Translation Files**: Located in `src/i18n/locales/`

### Adding New Languages

1. Create translation file: `src/i18n/locales/[lang-code].json`
2. Add language import and resource configuration to `src/i18n/config.ts`
3. Update the language switcher component in `src/components/LanguageSwitcher.tsx`

## SEO

- 内置 SEO 组件：`src/components/SEO.tsx`，无外部依赖
- 自动设置标题、描述、Open Graph、Twitter、canonical、结构化数据（JSON‑LD）
- `html lang` 与当前语言同步；标题与描述从 i18n `app.title`/`app.subtitle` 获取
- `public/index.html` 提供静态兜底，`public/robots.txt` 默认允许抓取（上线后可加入 Sitemap）

环境变量：

- `REACT_APP_SITE_URL`：站点根地址，用于 canonical 与 OG URL（运行时无此变量时回退 `window.location`）

使用方式：

- `SEO` 已在 `src/App.tsx` 挂载，开箱即用；如需自定义页面级别的 `title/description/keywords/canonicalUrl`，给组件传入对应 props。

## Development

### Project Structure

```
src/
├── App.tsx                    # Main application component
├── components/
│   ├── TaskSchedulerForm.tsx  # Task configuration form
│   ├── OutputDisplay.tsx      # Displays generated outputs
│   └── LanguageSwitcher.tsx   # Language selection component
├── utils/
│   └── taskGenerator.ts       # PowerShell/XML generation logic
├── i18n/
│   ├── config.ts             # i18n configuration
│   └── locales/              # Translation files (14 languages)
│       ├── zh-CN.json        # Chinese Simplified
│       ├── zh-TW.json        # Chinese Traditional
│       ├── en-US.json        # English
│       ├── ja-JP.json        # Japanese
│       ├── ko-KR.json        # Korean
│       ├── th-TH.json        # Thai
│       ├── id-ID.json        # Indonesian
│       ├── ar-SA.json        # Arabic
│       ├── de-DE.json        # German
│       ├── nl-NL.json        # Dutch
│       ├── es-ES.json        # Spanish
│       ├── pt-PT.json        # Portuguese
│       ├── fr-FR.json        # French
│       └── ru-RU.json        # Russian
└── index.css                 # Responsive styling
```

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### How It Works

This application uses a two-step process for creating scheduled tasks:

1. **XML Generation**: The application generates a complete XML configuration for your scheduled task
2. **Import Script**: A PowerShell script is generated that:
   - Creates a temporary XML file with the task configuration
   - Imports the XML as a scheduled task using `Register-ScheduledTask`
   - Cleans up the temporary file after import

This approach ensures compatibility and provides a reliable way to create scheduled tasks on Windows systems.

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **Internationalization**: react-i18next
- **Styling**: Vanilla CSS with responsive design
- **Build**: Create React App
- **Icons**: Lucide React

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers with ES6 support

## Troubleshooting

### Common Issues

1. **XML Import Script Not Working**
   - Ensure PowerShell 7+ is installed
   - Run PowerShell as Administrator
   - Check execution policy: `Get-ExecutionPolicy`
   - Make sure temporary directory is accessible

2. **Task Not Running**
   - Verify task name is unique
   - Check user account permissions
   - Review Windows Event Logs
   - Ensure the application path in the task is correct and accessible

3. **XML Import Issues**
   - Ensure XML file is properly encoded (UTF-16)
   - Check XML syntax validity
   - Verify task scheduler service is running
   - Check if task with same name already exists

### Getting Help

- Check the [Issues](https://github.com/username/repo/issues) page for known problems
- Review Windows Task Scheduler documentation
- Test commands in PowerShell before scheduling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Translation Contributions

Help improve translations by editing files in `src/i18n/locales/` or adding new languages.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Microsoft for Windows Task Scheduler documentation
- React community for excellent development tools
- Lucide team for beautiful icons
- Contributors and translators
