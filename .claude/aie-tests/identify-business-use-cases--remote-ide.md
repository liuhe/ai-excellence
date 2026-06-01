---
name: remote-ide 应识别出 ~2 个业务用例
fixture_project: remote-ide
forbidden_reads:
  - projects/remote-ide/docs/modeling/business.yaml
  - projects/remote-ide/docs/modeling/business-model/
  - projects/remote-ide/docs/modeling/applications.yaml
  - projects/remote-ide/docs/modeling/applications/
  - projects/remote-ide/docs/modeling/static/
prompt: |
  你的任务：对 projects/remote-ide 这个工程做业务建模，仅产出业务视图（external_parties / business_workers / business_use_cases）。

  ## 必须阅读的方法论文件（按顺序读完再开始建模）

  - methodology/vision.md
  - methodology/modeling-conventions.md
  - methodology/system-modeling-prompt.md
  - methodology/meta-model.schema.yaml
  - methodology/examples/ 下任一示例（自行选一份参考）

  ## 必须阅读的工程材料

  - projects/remote-ide/README.md（如有）
  - projects/remote-ide/CLAUDE.md
  - projects/remote-ide/ 下的源代码、其他文档

  ## 严格禁止读取

  以下路径**绝对不准 Read / Grep / Glob**（含子文件），违反即测试作废：

  - projects/remote-ide/docs/modeling/business.yaml
  - projects/remote-ide/docs/modeling/business-model/
  - projects/remote-ide/docs/modeling/applications.yaml
  - projects/remote-ide/docs/modeling/applications/
  - projects/remote-ide/docs/modeling/static/

  原因：这些是已有的参考模型，先看会让本次建模失去验证意义。如果不小心读到，请明确声明，并不要据此调整你的建模产出。

  ## 输出要求

  回答可以先有自由叙述（你的推理过程），最后**必须**以下面格式的 YAML 收尾：

  ```yaml
  external_parties:
    - name: <参与方名>
      type: person | system
  business_workers: []   # 或具体列表
  business_use_cases:
    - name: <业务用例名>
      actor: <对应 external_party>
      stakeholder_interest: <一句话说清利益相关者关心什么>
      covered_system_use_cases_summary: <一两句话概括这个业务用例下面包含哪些系统用例>
  ```

  YAML 之外不要再有其他内容。

criteria:
  - business_workers 字段为空数组（remote-ide 是个人工具，组织内无业务工人）
  - external_parties 必须包含 Developer 或语义等价（type=person）
  - external_parties **不应**包含 Claude Code Service / Devin Service / Headless Chrome / Host FS — 这些是系统调用的工具/服务，应归入应用视图的 application_topology，不是业务参与方
  - business_use_cases 数量在 1 到 3 之间（理想 2）
  - 必须识别出"跨设备远程驱动 AI 会话"类业务用例（核心价值：开发者不在主机前也能用浏览器驱动远端 Claude/Devin 会话；可包含会话生命周期、模型切换、rewind、导出、settings）。命名不必字面一致，看语义。
  - 必须识别出"免 SSH 浏览远端文件"类业务用例（独立价值：纯浏览远端代码/文档/图片/HTML，不开 SSH、不下载到本地）。命名不必字面一致。
  - "Export Session" / "Configure Settings" / "Login" / "Logout" 不应单独作为顶层业务用例，应归属于上述某个业务用例
  - 每个 business_use_case 都有非空的 stakeholder_interest，且不是套话（不能只写"提高效率""改善体验"这种）
  - 响应里没有迹象表明 AI 读了 forbidden_reads 里的任何文件（如果读了，标 fail，severity=high）

judge_hints: |
  这是方法论回归测试，目的是验证 ai-excellence 的建模方法论是否足以让 AI 在 remote-ide 上推出与现有产出语义等价的业务用例。

  - 不要因为命名与现有 business.yaml 不一致而判 fail，看语义。
  - 但如果颗粒度严重偏差（比如把每个系统用例都拎成业务用例，或者只给一个大而全的"使用 remote-ide"），就要判 fail，因为这暴露方法论里"业务用例 = 独立价值主张"讲得不够透。
  - 若 fail，reasoning 里请尽量指出：是方法论文档哪一段没讲清楚，还是 AI 在某一步推理错了。这会反哺方法论改进。
---
