{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  inputs.noxide.url = "github:dominicegginton/noxide";

  outputs = {
    self,
    nixpkgs,
    noxide,
  }: let
    version = builtins.substring 0 8 self.lastModifiedDate;
    supportedSystems = ["x86_64-linux" "x86_64-darwin"];

    forAllSystems = f:
      nixpkgs.lib.genAttrs supportedSystems (system: f system);

    nixpkgsFor = forAllSystems (system:
      import nixpkgs {
        inherit system;
        overlays = [
          self.overlays.default
          noxide.overlays.default
        ];
      });

    node = forAllSystems (
      system:
        nixpkgsFor.${system}.nodejs_20
    );
  in {
    formatter = forAllSystems (
      system:
        nixpkgsFor.${system}.alejandra
    );
    overlays = {
      default = final: prev: {
        ws-data-streaming-playground = final.noxide.buildPackage ./. {
          installPhase = ''
            mkdir -p $out
            cp -r . $out
            mkdir -p $out/bin
            echo "${node.${final.system}}/bin/node src/server.js" > $out/bin/ws-data-streaming-playground
            chmod +x $out/bin/ws-data-streaming-playground
          '';
        };
      };
    };

    packages = forAllSystems (system: {
      inherit (nixpkgsFor.${system}) ws-data-streaming-playground;

      default = self.packages.${system}.ws-data-streaming-playground;
    });

    devShells = forAllSystems (system: let
      pkgs = nixpkgsFor.${system};
      inherit (pkgs) mkShell;
    in {
      default = mkShell {
        packages = with pkgs; [node.${system}];
      };
    });
  };
}
