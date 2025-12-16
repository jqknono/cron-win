总是使用中文回复.

# Repository Guidelines

## 项目结构与模块组织
应用基于 Create React App，源码集中在 `src/`。`src/components` 存放表单组件、输出面板和语言切换器，遵循单文件每个组件。`src/utils/taskGenerator.ts` 封装 Windows 任务计划生成逻辑，便于在表单状态之外复用。国际化词条位于 `src/i18n/locales/`，更新翻译时保持键名与 `en-US.json` 对齐。构建产出写入 `build/`，静态资源和模板位于 `public/`。

## 构建、测试与开发命令
`npm start`：调用 `react-scripts start`，在 http://localhost:3000 开启带 HMR 的开发服务器。`npm run build`：生成压缩后的生产包到 `build/`，用于发布或静态托管。`npm test`：以 watch 模式运行 Jest，适合边改边测；CI 场景请附加 `CI=true`。如需自定义配置，可在评估后执行 `npm run eject`，此操作不可逆。

## 代码风格与命名约定
TypeScript 与 JSX 文件使用 2 空格缩进，导入顺序建议由外到内。组件名与文件名保持 PascalCase，例如 `TaskSchedulerForm.tsx`。状态与回调使用 camelCase，国际化键采用 `section.key` 格式。CSS 由 `src/index.css` 管理，避免内联样式；新增样式请考虑作用域类名如 `task-scheduler__label`。

## 测试指引
项目默认集成 Jest 与 Testing Library。新增测试文件命名为 `*.test.tsx` 或 `*.test.ts` 并置于与源码同级。表单转换和 XML 生成逻辑应通过 `src/utils/taskGenerator.ts` 的单元测试覆盖，重点验证区域化输入与重复执行。提交前请运行 `npm test -- --watch=false` 确认无断言失败。

## 提交与 Pull Request
现有提交遵循完整句式描述（例如 “Initialize project structure...”）。延续此风格，首字母大写、保持祈使语气并聚焦变更动机。Pull Request 请提供：1) 简要改动说明；2) 测试方式或截图；3) 关联的 issue 编号。若变更影响调度命令或 XML 模板，请强调回归范围并提醒翻译同步。

## 安全与配置提示
开发环境变量存放于 `.env.development.local`，勿将敏感凭证提交版本库。任务计划导出的命令涉及执行路径，测试前确认 Windows 环境具备相应权限。若新增外部依赖，请先评估许可协议并更新 `package-lock.json`。
