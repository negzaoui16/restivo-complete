import * as THREE from "three";

export class MaterialPalette {
  // Floor & Architecture
  floor: THREE.MeshStandardMaterial;
  floorBorder: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  wallTop: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  doorFrame: THREE.MeshStandardMaterial;
  doorPanel: THREE.MeshStandardMaterial;
  column: THREE.MeshStandardMaterial;
  stairs: THREE.MeshStandardMaterial;

  // Furniture Woods & Metals
  woodOak: THREE.MeshStandardMaterial;
  woodWalnut: THREE.MeshStandardMaterial;
  woodLight: THREE.MeshStandardMaterial;
  metalDark: THREE.MeshStandardMaterial;
  metalGold: THREE.MeshStandardMaterial;
  metalChrome: THREE.MeshStandardMaterial;
  cushionTerracotta: THREE.MeshStandardMaterial;
  cushionCream: THREE.MeshStandardMaterial;
  cushionCharcoal: THREE.MeshStandardMaterial;

  // Kitchen & Bar
  stainlessSteel: THREE.MeshStandardMaterial;
  counterStone: THREE.MeshStandardMaterial;
  tileBathroom: THREE.MeshStandardMaterial;
  kitchenTile: THREE.MeshStandardMaterial;
  cooktopGlass: THREE.MeshStandardMaterial;
  cabinetMat: THREE.MeshStandardMaterial;

  // Fixtures (Bathroom & Kitchen)
  porcelain: THREE.MeshStandardMaterial;

  // Interaction highlights
  selectedGlow: THREE.MeshStandardMaterial;
  hoverGlow: THREE.MeshStandardMaterial;
  availableIndicator: THREE.MeshStandardMaterial;
  bookedIndicator: THREE.MeshStandardMaterial;
  tableTextMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.floor = new THREE.MeshStandardMaterial({
      color: 0xf0ece1,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.floorBorder = new THREE.MeshStandardMaterial({
      color: 0xd9d2c2,
      roughness: 0.7,
      metalness: 0.1,
    });

    this.wall = new THREE.MeshStandardMaterial({
      color: 0xede8dc,
      roughness: 0.9,
      metalness: 0.02,
    });

    this.wallTop = new THREE.MeshStandardMaterial({
      color: 0xd4cbb8,
      roughness: 0.6,
      metalness: 0.1,
    });

    this.glass = new THREE.MeshPhysicalMaterial({
      color: 0xddeef5,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      transmission: 0.85,
      ior: 1.5,
    });

    this.doorFrame = new THREE.MeshStandardMaterial({
      color: 0x4a433d,
      roughness: 0.5,
      metalness: 0.2,
    });

    this.doorPanel = new THREE.MeshStandardMaterial({
      color: 0x9e7354,
      roughness: 0.7,
      metalness: 0.05,
    });

    this.column = new THREE.MeshStandardMaterial({
      color: 0xe6e0d3,
      roughness: 0.8,
      metalness: 0.05,
    });

    this.stairs = new THREE.MeshStandardMaterial({
      color: 0x8a6347,
      roughness: 0.75,
      metalness: 0.1,
    });

    this.woodOak = new THREE.MeshStandardMaterial({
      color: 0xa87d55,
      roughness: 0.6,
      metalness: 0.05,
    });

    this.woodWalnut = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.65,
      metalness: 0.05,
    });

    this.woodLight = new THREE.MeshStandardMaterial({
      color: 0xc9a982,
      roughness: 0.7,
      metalness: 0.05,
    });

    this.metalDark = new THREE.MeshStandardMaterial({
      color: 0x2e2926,
      roughness: 0.4,
      metalness: 0.8,
    });

    this.metalGold = new THREE.MeshStandardMaterial({
      color: 0xcbb071,
      roughness: 0.35,
      metalness: 0.7,
    });

    this.metalChrome = new THREE.MeshStandardMaterial({
      color: 0xd6d9dc,
      roughness: 0.25,
      metalness: 0.9,
    });

    this.cushionTerracotta = new THREE.MeshStandardMaterial({
      color: 0xb55234,
      roughness: 0.85,
      metalness: 0.02,
    });

    this.cushionCream = new THREE.MeshStandardMaterial({
      color: 0xede8dc,
      roughness: 0.9,
      metalness: 0.02,
    });

    this.cushionCharcoal = new THREE.MeshStandardMaterial({
      color: 0x3d3835,
      roughness: 0.85,
      metalness: 0.02,
    });

    this.stainlessSteel = new THREE.MeshStandardMaterial({
      color: 0xc8ced2,
      roughness: 0.28,
      metalness: 0.85,
    });

    this.counterStone = new THREE.MeshStandardMaterial({
      color: 0x3b3531,
      roughness: 0.4,
      metalness: 0.15,
    });

    this.tileBathroom = new THREE.MeshStandardMaterial({
      color: 0xe5ebee,
      roughness: 0.3,
      metalness: 0.05,
    });

    this.kitchenTile = new THREE.MeshStandardMaterial({
      color: 0xded9cf,
      roughness: 0.4,
      metalness: 0.05,
    });

    this.cooktopGlass = new THREE.MeshStandardMaterial({
      color: 0x1f1f1f,
      roughness: 0.15,
      metalness: 0.8,
    });

    this.cabinetMat = new THREE.MeshStandardMaterial({
      color: 0x3b3833,
      roughness: 0.6,
      metalness: 0.15,
    });

    this.porcelain = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.05,
    });

    this.selectedGlow = new THREE.MeshStandardMaterial({
      color: 0xb55234,
      emissive: 0xb55234,
      emissiveIntensity: 0.5,
      roughness: 0.3,
    });

    this.hoverGlow = new THREE.MeshStandardMaterial({
      color: 0xd97757,
      emissive: 0xd97757,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    });

    this.availableIndicator = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      emissive: 0x2e7d32,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      transparent: true,
      opacity: 0.85,
    });

    this.bookedIndicator = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.8,
      transparent: true,
      opacity: 0.6,
    });

    this.tableTextMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
  }

  dispose() {
    Object.values(this).forEach((prop) => {
      if (prop instanceof THREE.Material) {
        prop.dispose();
      }
    });
  }
}
