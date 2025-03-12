# .idx/dev.nix
{ pkgs }: {
  packages = with pkgs; [
    zsh
    nano
    (writeShellScriptBin "setup-npm-packages" ''
      npm install -g @anthropic-ai/claude-code
    '')
  ];
}