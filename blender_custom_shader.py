"""
Blender Custom Shader — Procedural Toon/Cel Shader
Run this script in Blender's Scripting workspace (Text Editor → Run Script).

Creates a material with a custom node setup:
- Procedural gradient (object-space) for base color variation
- Color Ramp for toon/cel shading (stepped diffuse)
- Optional rim light and specular highlight
- Fully node-based, no textures required

Usage:
  1. Open Blender, select an object (or add a mesh).
  2. Open Scripting workspace, New script, paste this file (or open it).
  3. Run Script (Alt+P or play button).
  4. The active object gets the "CustomToon" material; adjust in Shading workspace.
"""

import bpy

MAT_NAME = "CustomToon"
NODE_TREE_NAME = "CustomToonNodes"


def clear_material(mat):
    """Remove all nodes so we can build from scratch."""
    if mat.node_tree:
        for node in list(mat.node_tree.nodes):
            mat.node_tree.nodes.remove(node)


def create_custom_toon_shader():
    """Build the custom shader node tree."""
    # Get or create material
    mat = bpy.data.materials.get(MAT_NAME)
    if mat is None:
        mat = bpy.data.materials.new(name=MAT_NAME)
    mat.use_nodes = True
    clear_material(mat)

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Layout spacing
    dx = 280
    dy = -320

    # --- Output ---
    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (0, 0)

    # --- Mix Shader: combine diffuse toon + specular ---
    mix = nodes.new("ShaderNodeMixShader")
    mix.location = (-dx, 0)
    links.new(mix.outputs["Shader"], out.inputs["Surface"])

    # --- Diffuse: use a custom toon (ramp) result ---
    # Diffuse BSDF (we'll feed a modified result for toon)
    diffuse = nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.location = (-dx * 2, 80)

    # Geometry: Normal (for lighting direction)
    geo = nodes.new("ShaderNodeNewGeometry")
    geo.location = (-dx * 4, 200)

    # Dot product of normal and a "light dir" gives a gradient for the ramp
    # Using Object position Y + Normal as a simple procedural gradient
    combine_xyz = nodes.new("ShaderNodeCombineXYZ")
    combine_xyz.location = (-dx * 4, -80)
    combine_xyz.inputs["X"].default_value = 0.5
    combine_xyz.inputs["Y"].default_value = 0.5
    combine_xyz.inputs["Z"].default_value = 1.0  # light from front

    dot = nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    dot.location = (-dx * 3, 80)
    links.new(geo.outputs["Normal"], dot.inputs[0])
    links.new(combine_xyz.outputs["Vector"], dot.inputs[1])

    # Map dot from [-1,1] to [0,1] for Color Ramp
    map_range = nodes.new("ShaderNodeMapRange")
    map_range.location = (-dx * 2.5, 80)
    map_range.inputs["From Min"].default_value = -1.0
    map_range.inputs["From Max"].default_value = 1.0
    map_range.inputs["To Min"].default_value = 0.0
    map_range.inputs["To Max"].default_value = 1.0
    links.new(dot.outputs["Value"], map_range.inputs["Value"])

    # Color Ramp — toon steps (few bands)
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (-dx * 2, 80)
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.15, 0.18, 0.25, 1.0)   # shadow
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (0.85, 0.88, 0.95, 1.0)  # lit
    # Add mid tone
    ramp.color_ramp.elements.new(0.45)
    ramp.color_ramp.elements[1].position = 0.45
    ramp.color_ramp.elements[1].color = (0.45, 0.5, 0.6, 1.0)
    ramp.color_ramp.elements[2].position = 1.0
    links.new(map_range.outputs["Result"], ramp.inputs["Fac"])

    # Multiply diffuse color by ramp to get toon shading
    diffuse_color = nodes.new("ShaderNodeRGB")
    diffuse_color.location = (-dx * 2, 280)
    diffuse_color.outputs[0].default_value = (0.4, 0.5, 0.7, 1.0)  # tint

    mult = nodes.new("ShaderNodeMixRGB")
    mult.blend_type = "MULTIPLY"
    mult.location = (-dx * 2, 160)
    links.new(ramp.outputs["Color"], mult.inputs["Color1"])
    links.new(diffuse_color.outputs["Color"], mult.inputs["Color2"])

    links.new(mult.outputs["Color"], diffuse.inputs["Color"])
    links.new(geo.outputs["Normal"], diffuse.inputs["Normal"])
    links.new(diffuse.outputs["BSDF"], mix.inputs[1])

    # --- Specular highlight (optional second shader) ---
    glossy = nodes.new("ShaderNodeBsdfGlossy")
    glossy.location = (-dx * 2, -200)
    glossy.inputs["Roughness"].default_value = 0.15

    # Mix factor: only where dot is high (facing light) and we want a small spec
    spec_ramp = nodes.new("ShaderNodeValToRGB")
    spec_ramp.location = (-dx * 3, -200)
    spec_ramp.color_ramp.elements[0].position = 0.65
    spec_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    spec_ramp.color_ramp.elements[1].position = 1.0
    spec_ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    links.new(map_range.outputs["Result"], spec_ramp.inputs["Fac"])
    links.new(spec_ramp.outputs["Color"], mix.inputs["Fac"])
    links.new(glossy.outputs["BSDF"], mix.inputs[2])

    # --- Rim / fresnel (optional): add as separate mix for rim color
    # For simplicity we'll leave the main mix as diffuse + specular.
    # You can add an Emission node driven by Fresnel and mix again for a rim.

    return mat


def assign_to_active():
    """Assign the material to the active object."""
    obj = bpy.context.active_object
    if obj and obj.type == "MESH":
        if obj.data.materials:
            obj.data.materials[0] = bpy.data.materials[MAT_NAME]
        else:
            obj.data.materials.append(bpy.data.materials[MAT_NAME])
        print(f"Assigned '{MAT_NAME}' to {obj.name}")
    else:
        print("Select a mesh object to assign the material.")


if __name__ == "__main__":
    create_custom_toon_shader()
    assign_to_active()
    print("Custom Toon shader created. Open Shading workspace to edit nodes.")
