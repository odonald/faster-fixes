"use client";

import { Button } from "@workspace/ui/components/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

type McpSetupGuideProps = {
  /** Public URL of this instance, e.g. https://fixes.example.com */
  instanceUrl: string;
};

/**
 * In-app how-to for connecting a coding agent. Deliberately repeats the three
 * rules people forget: one token per organisation, one config file per repo,
 * only the project id changes for a new project.
 */
export function McpSetupGuide({ instanceUrl }: McpSetupGuideProps) {
  const snippet = `{
  "mcpServers": {
    "faster-fixes": {
      "command": "npx",
      "args": ["-y", "@fasterfixes/mcp"],
      "env": {
        "FASTER_FIXES_URL": "${instanceUrl}",
        "FASTER_FIXES_PROJECT": "proj_xxx",
        "FASTER_FIXES_TOKEN": "\${FASTER_FIXES_TOKEN}"
      }
    }
  }
}`;

  return (
    <div className="flex flex-col gap-5 text-sm">
      <ol className="text-muted-foreground list-decimal space-y-3 pl-5">
        <li>
          <span className="text-foreground font-medium">Once per organisation:</span>{" "}
          create an agent token above and put it in your shell profile so every
          repo can use it:
          <CodeBlock code={`echo 'export FASTER_FIXES_TOKEN="ff_agent_..."' >> ~/.zshrc`} />
        </li>
        <li>
          <span className="text-foreground font-medium">Once per repository:</span>{" "}
          save this as <code>.mcp.json</code> in the repo root and replace{" "}
          <code>proj_xxx</code> with the project id from <em>Project Settings</em>.
          The token is read from the environment, so the file is safe to commit.
          <CodeBlock code={snippet} />
        </li>
        <li>
          <span className="text-foreground font-medium">New project later:</span>{" "}
          create it in the dashboard, copy the same file into its repo, change
          only the project id. The token stays the same.
        </li>
      </ol>
      <p className="text-muted-foreground">
        Then restart Claude Code (or Cursor / VS Code) in that folder and ask it to
        list open feedback. Full reference:{" "}
        <a
          href="/docs/mcp/setup"
          className="text-primary underline underline-offset-4 hover:text-primary/80"
        >
          MCP setup docs
        </a>
        .
      </p>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context) – the text is still selectable.
    }
  }

  return (
    <div className="relative mt-2">
      <pre className="bg-muted overflow-x-auto rounded-md p-3 pr-12 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-2 right-2"
        onClick={copy}
        aria-label="Copy"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
}
