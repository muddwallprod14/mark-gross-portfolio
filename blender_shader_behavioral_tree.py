# SPDX-License-Identifier: GPL-3.0-or-later
# Shader Behavioral Tree — Blender widget (panel + operator)
#
# Uses node-based shading only (Eevee + Cycles, GPU-friendly). For custom
# shader code, Blender's Script node (OSL) can be added later — OSL works
# in Cycles CPU/OptiX only. See: Shader Editor → Add Node → Script.

bl_info = {
    "name": "Shader Behavioral Tree",
    "author": "Mark Gross",
    "version": (1, 1, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar (N) > Shader Behavioral Tree",
    "description": "Create a conditional shader tree (Facing / Height → Toon, Metallic, Emissive) from a widget.",
    "category": "Material",
}

import bpy

MAT_NAME = "ShaderBehavioralTree"
DX = 320
DY = -300


def clear_material(mat):
    if mat.node_tree:
        for node in list(mat.node_tree.nodes):
            mat.node_tree.nodes.remove(node)


def _frame(nodes, label, x, y, w=2, h=3):
    """Create a labeled frame; returns (frame, x_off, y_off) for placing children."""
    frame = nodes.new("NodeFrame")
    frame.location = (x, y)
    frame.label = label
    frame.use_custom_color = True
    frame.color = (0.2, 0.25, 0.35)
    frame.width = w * DX
    frame.height = h * abs(DY)
    return frame


def create_behavioral_tree():
    mat = bpy.data.materials.get(MAT_NAME)
    if mat is None:
        mat = bpy.data.materials.new(name=MAT_NAME)
    mat.use_nodes = True
    clear_material(mat)

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (0, 0)

    # ---- Single shared Geometry (one lookup, reuse for all branches) ----
    geo = nodes.new("ShaderNodeNewGeometry")
    geo.location = (-DX * 4, 80)
    geo.label = "Geometry (shared)"

    # ---- Conditions frame ----
    frame_cond = _frame(nodes, "Conditions", -DX * 4.2, 420, w=2.2, h=2.2)
    layer_weight = nodes.new("ShaderNodeLayerWeight")
    layer_weight.location = (-DX * 4, 400)
    layer_weight.inputs["Blend"].default_value = 0.5
    layer_weight.parent = frame_cond

    sep_xyz = nodes.new("ShaderNodeSeparateXYZ")
    sep_xyz.location = (-DX * 4, -40)
    sep_xyz.parent = frame_cond
    links.new(geo.outputs["Position"], sep_xyz.inputs["Vector"])

    map_height = nodes.new("ShaderNodeMapRange")
    map_height.location = (-DX * 3.5, 0)
    map_height.inputs["From Min"].default_value = -2.0
    map_height.inputs["From Max"].default_value = 2.0
    map_height.inputs["To Min"].default_value = 0.0
    map_height.inputs["To Max"].default_value = 1.0
    map_height.parent = frame_cond
    links.new(sep_xyz.outputs["Y"], map_height.inputs["Value"])

    ramp_facing = nodes.new("ShaderNodeValToRGB")
    ramp_facing.location = (-DX * 3, 400)
    ramp_facing.color_ramp.elements[0].position = 0.4
    ramp_facing.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp_facing.color_ramp.elements[1].position = 0.6
    ramp_facing.color_ramp.elements[1].color = (1, 1, 1, 1)
    ramp_facing.parent = frame_cond
    links.new(layer_weight.outputs["Facing"], ramp_facing.inputs["Fac"])

    ramp_height = nodes.new("ShaderNodeValToRGB")
    ramp_height.location = (-DX * 3, 0)
    ramp_height.color_ramp.elements[0].position = 0.3
    ramp_height.color_ramp.elements[0].color = (0, 0, 0, 1)
    ramp_height.color_ramp.elements[1].position = 0.7
    ramp_height.color_ramp.elements[1].color = (1, 1, 1, 1)
    ramp_height.parent = frame_cond
    links.new(map_height.outputs["Result"], ramp_height.inputs["Fac"])

    layer_weight.label = "Condition: Facing"
    ramp_facing.label = "Facing Threshold"
    map_height.label = "Condition: Height (Y)"
    ramp_height.label = "Height Threshold"

    # ---- Behavior: Toon (reuse geo) ----
    frame_toon = _frame(nodes, "Behavior: Toon", -DX * 4.2, 380, w=2.2, h=1.8)
    dot_light = nodes.new("ShaderNodeVectorMath")
    dot_light.operation = "DOT_PRODUCT"
    dot_light.location = (-DX * 3.5, 200)
    dot_light.parent = frame_toon
    light_dir = nodes.new("ShaderNodeCombineXYZ")
    light_dir.location = (-DX * 4, 360)
    light_dir.inputs["Z"].default_value = 1.0
    light_dir.parent = frame_toon
    links.new(geo.outputs["Normal"], dot_light.inputs[0])
    links.new(light_dir.outputs["Vector"], dot_light.inputs[1])

    map_toon = nodes.new("ShaderNodeMapRange")
    map_toon.location = (-DX * 3, 200)
    map_toon.inputs["From Min"].default_value = -1.0
    map_toon.inputs["From Max"].default_value = 1.0
    map_toon.parent = frame_toon
    links.new(dot_light.outputs["Value"], map_toon.inputs["Value"])

    ramp_toon = nodes.new("ShaderNodeValToRGB")
    ramp_toon.location = (-DX * 2.5, 200)
    ramp_toon.color_ramp.elements[0].position = 0.0
    ramp_toon.color_ramp.elements[0].color = (0.2, 0.22, 0.3, 1)
    ramp_toon.color_ramp.elements[1].position = 1.0
    ramp_toon.color_ramp.elements[1].color = (0.8, 0.85, 0.95, 1)
    ramp_toon.parent = frame_toon
    links.new(map_toon.outputs["Result"], ramp_toon.inputs["Fac"])

    bsdf_toon = nodes.new("ShaderNodeBsdfDiffuse")
    bsdf_toon.location = (-DX * 2, 200)
    bsdf_toon.parent = frame_toon
    bsdf_toon.label = "Behavior: Toon"
    links.new(ramp_toon.outputs["Color"], bsdf_toon.inputs["Color"])
    links.new(geo.outputs["Normal"], bsdf_toon.inputs["Normal"])

    # ---- Behavior: Metallic (reuse geo) ----
    frame_metal = _frame(nodes, "Behavior: Metallic", -DX * 4.2, -20, w=2.2, h=1.4)
    bsdf_metal = nodes.new("ShaderNodeBsdfGlossy")
    bsdf_metal.location = (-DX * 2, -100)
    bsdf_metal.inputs["Roughness"].default_value = 0.2
    bsdf_metal.parent = frame_metal
    bsdf_metal.label = "Behavior: Metallic"
    metal_color = nodes.new("ShaderNodeRGB")
    metal_color.location = (-DX * 3, -100)
    metal_color.outputs[0].default_value = (0.72, 0.65, 0.55, 1)
    metal_color.parent = frame_metal
    links.new(metal_color.outputs["Color"], bsdf_metal.inputs["Color"])
    links.new(geo.outputs["Normal"], bsdf_metal.inputs["Normal"])

    # ---- Behavior: Emissive ----
    frame_emissive = _frame(nodes, "Behavior: Emissive", -DX * 4.2, -340, w=2.2, h=1.2)
    emissive = nodes.new("ShaderNodeEmission")
    emissive.location = (-DX * 2, -320)
    emissive.inputs["Strength"].default_value = 2.0
    emissive.parent = frame_emissive
    emissive.label = "Behavior: Emissive"
    emissive_color = nodes.new("ShaderNodeRGB")
    emissive_color.location = (-DX * 3, -320)
    emissive_color.outputs[0].default_value = (0.4, 0.6, 1.0, 1)
    emissive_color.parent = frame_emissive
    links.new(emissive_color.outputs["Color"], emissive.inputs["Color"])

    # ---- Mix Tree frame ----
    frame_mix = _frame(nodes, "Mix Tree", -DX * 1.8, -120, w=1.6, h=1.6)
    mix_height = nodes.new("ShaderNodeMixShader")
    mix_height.location = (-DX * 1.5, -200)
    mix_height.parent = frame_mix
    mix_height.label = "Select: Height"
    links.new(ramp_height.outputs["Color"], mix_height.inputs["Fac"])
    links.new(bsdf_metal.outputs["BSDF"], mix_height.inputs[1])
    links.new(emissive.outputs["Emission"], mix_height.inputs[2])

    mix_facing = nodes.new("ShaderNodeMixShader")
    mix_facing.location = (-DX * 0.5, 0)
    mix_facing.parent = frame_mix
    mix_facing.label = "Select: Facing"
    links.new(ramp_facing.outputs["Color"], mix_facing.inputs["Fac"])
    links.new(bsdf_toon.outputs["BSDF"], mix_facing.inputs[1])
    links.new(mix_height.outputs["Shader"], mix_facing.inputs[2])

    links.new(mix_facing.outputs["Shader"], out.inputs["Surface"])

    return mat


# -----------------------------------------------------------------------------
# Operator: create the tree and assign to selected objects
# -----------------------------------------------------------------------------
class SHADER_BT_OT_create(bpy.types.Operator):
    bl_idname = "shader_bt.create"
    bl_label = "Create Shader Behavioral Tree"
    bl_description = "Create conditional shader tree and assign to selected mesh(es)"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        mat = create_behavioral_tree()
        assigned = 0
        for obj in context.selected_objects:
            if obj.type == "MESH":
                if obj.data.materials:
                    obj.data.materials[0] = mat
                else:
                    obj.data.materials.append(mat)
                assigned += 1
        if assigned == 0:
            self.report({"WARNING"}, "No mesh selected")
        else:
            self.report({"INFO"}, f"Assigned to {assigned} object(s)")
        return {"FINISHED"}


# -----------------------------------------------------------------------------
# Panel (widget) in 3D View sidebar
# -----------------------------------------------------------------------------
class SHADER_BT_PT_panel(bpy.types.Panel):
    bl_label = "Shader Behavioral Tree"
    bl_idname = "SHADER_BT_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Shader BT"

    def draw(self, context):
        layout = self.layout
        layout.operator("shader_bt.create", icon="NODETREE")
        layout.separator()
        layout.label(text="Facing → Toon | Edge → Height")
        layout.label(text="Height → Metallic (low) / Emissive (high)")


# -----------------------------------------------------------------------------
# Registration
# -----------------------------------------------------------------------------
classes = (SHADER_BT_OT_create, SHADER_BT_PT_panel)


def register():
    for c in classes:
        bpy.utils.register_class(c)


def unregister():
    for c in reversed(classes):
        bpy.utils.unregister_class(c)


if __name__ == "__main__":
    register()
