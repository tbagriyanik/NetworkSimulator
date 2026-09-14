import { describe, expect, it } from 'vitest';
import { executePythonScript } from '@/components/network/pc-panel/pcPythonRunner';
import { getActiveDevice3DScene } from '@/components/network/pc-panel/pcPython3DModule';
import { generate3DSceneHtml } from '@/components/network/pc-panel/pcPython3DRenderer';

describe('Python 3D Engine (scene3d)', () => {
  it('creates an interactive 3D scene with primitives, lights, and shows it', () => {
    const code = `
from scene3d import Scene, Plane, Cube, Sphere, Cylinder, Prism

scene = Scene(title="Test 3D", sky="sunset", grid=True)
floor = Plane(width=20, height=20, color="#222222")
cube1 = Cube(size=2, color="blue")
sphere1 = Sphere(radius=1.5, color="red")
cyl1 = Cylinder(radius=1, height=3, color="green")
prism1 = Prism(sides=3, radius=1.2, height=2, color="orange")

scene.add(floor, cube1, sphere1, cyl1, prism1)
scene.add_sun([5, 10, 5], 1.2, "#ffffff")
scene.add_lamp([0, 4, 0], 1.0, "#ffeedd")

scene.show()
print("3D Scene Created")
`;

    const res = executePythonScript(code, [], undefined, 'device-test-1');
    expect(res.error).toBeUndefined();
    expect(res.output).toContain('3D Scene Created');

    const scene = getActiveDevice3DScene('device-test-1');
    expect(scene).not.toBeNull();
    expect(scene?.title).toBe('Test 3D');
    expect(scene?.environment.sky.type).toBe('sunset');
    expect(scene?.environment.grid.enabled).toBe(true);
    expect(scene?.objects.length).toBe(5);

    const types = scene?.objects.map(o => o.type);
    expect(types).toContain('plane');
    expect(types).toContain('cube');
    expect(types).toContain('sphere');
    expect(types).toContain('cylinder');
    expect(types).toContain('prism');

    // Test HTML generation
    const html = generate3DSceneHtml(scene!);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Test 3D');
    expect(html).toContain('render-canvas');
    expect(html).toContain('btn-wireframe');
  });

  it('supports combining objects (union) and subtracting objects (CSG difference)', () => {
    const code = `
import scene3d as s3d

scene = s3d.Scene("Boolean CSG Test")
box = s3d.Cube(size=2, color="#00ff00")
cutter = s3d.Cylinder(radius=0.5, height=4, color="#ff0000")

# Subtract cutter from box
carved = box.subtract(cutter)
scene.add(carved)

# Combine two other shapes
s1 = s3d.Sphere(radius=1)
s2 = s3d.Cube(size=1)
merged = s1.combine(s2)
scene.add(merged)

scene.show()
`;

    const res = executePythonScript(code, [], undefined, 'device-test-2');
    expect(res.error).toBeUndefined();

    const scene = getActiveDevice3DScene('device-test-2');
    expect(scene).not.toBeNull();
    expect(scene?.objects.length).toBe(2);

    const first = scene?.objects[0];
    expect(first?.type).toBe('compound');
    expect(first?.operation).toBe('subtract');
    expect(first?.operands?.length).toBe(1);
    expect(first?.operands?.[0].type).toBe('cylinder');

    const second = scene?.objects[1];
    expect(second?.type).toBe('compound');
    expect(second?.operation).toBe('union');
  });

  it('supports material customization: color, roughness, metalness, wireframe', () => {
    const code = `
from scene3d import Scene, Cube

scene = Scene("Material Test")
c = Cube(size=3, color="#abcdef", roughness=0.1, metalness=0.9, wireframe=True)
scene.add(c)
scene.show()
`;

    const res = executePythonScript(code, [], undefined, 'device-test-3');
    expect(res.error).toBeUndefined();

    const scene = getActiveDevice3DScene('device-test-3');
    const obj = scene?.objects[0];
    expect(obj?.material.color).toBe('#abcdef');
    expect(obj?.material.roughness).toBe(0.1);
    expect(obj?.material.metalness).toBe(0.9);
    expect(obj?.material.wireframe).toBe(true);
  });
});
