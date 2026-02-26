(function () {
    const overlay = document.getElementById('codeModalOverlay');
    const titleEl = document.getElementById('codeModalTitle');
    const contextEl = document.getElementById('codeModalContext');
    const descEl = document.getElementById('codeModalDesc');
    const codeEl = document.getElementById('codeModalCode');
    const tabsEl = document.getElementById('codeModalTabs');
    const githubBtn = document.getElementById('codeModalGithub');
    const closeBtn = document.getElementById('codeModalClose');

    if (!overlay) return;

    function hl() { /* no-op, kept for compat */ }

    const PROJECTS = {
        'hdri-light-rig': {
            context: 'Personal · Open Source',
            title: 'HDRI Light Rig Manager',
            desc: 'USD-native look dev lighting tool for Houdini Solaris — HDRI browser, turntable rig, contact sheet renderer. Built with pxr USD Python API, PySide2, and Karma.',
            github: 'https://github.com/muddwallprod14/hdri-light-rig-manager',
            tabs: [
                { name: 'usd_scene_builder.py', code:
`from pxr import Usd, UsdGeom, UsdLux, UsdShade, Sdf, Gf, Vt, Kind


class LookDevSceneBuilder:
    """Builds a USD look dev stage from scratch using
    Pixar's USD Python API — DCC-agnostic."""

    DEFAULT_CONFIG = {
        "hdri_path": "",
        "hdri_rotation": 0.0,
        "hdri_exposure": 0.0,
        "turntable_frames": 120,
        "cam_distance": 5.0,
        "cam_height": 1.2,
    }

    def __init__(self, stage_path=None, config=None):
        self.config = dict(self.DEFAULT_CONFIG)
        if config:
            self.config.update(config)

        if stage_path:
            self.stage = Usd.Stage.CreateNew(stage_path)
        else:
            self.stage = Usd.Stage.CreateInMemory()

        UsdGeom.SetStageUpAxis(self.stage, UsdGeom.Tokens.y)
        UsdGeom.SetStageMetersPerUnit(self.stage, 0.01)

    def build(self):
        """Construct the full look dev scene."""
        self._create_root()
        self._create_dome_light()
        self._create_turntable()
        self._create_camera()
        self._create_ground_plane()
        self._create_asset_anchor()
        return self.stage

    def _create_dome_light(self):
        """UsdLuxDomeLight with HDRI texture and rotation."""
        dome_path = "/LookDev/Lighting/DomeLight"
        self._dome_light = UsdLux.DomeLight.Define(
            self.stage, dome_path
        )

        if self.config["hdri_path"]:
            self._dome_light.CreateTextureFileAttr(
                self.config["hdri_path"]
            )

        self._dome_light.CreateExposureAttr(
            self.config["hdri_exposure"]
        )
        self._dome_light.CreateTextureFormatAttr(
            UsdLux.Tokens.latlong
        )

        xformable = UsdGeom.Xformable(
            self._dome_light.GetPrim()
        )
        rotate_op = xformable.AddRotateYOp(
            opSuffix="hdriRotation"
        )
        rotate_op.Set(self.config["hdri_rotation"])

    def _create_turntable(self):
        """Animated Y rotation over the frame range."""
        self._turntable = UsdGeom.Xform.Define(
            self.stage, "/LookDev/Turntable"
        )
        xformable = UsdGeom.Xformable(
            self._turntable.GetPrim()
        )
        rotate_op = xformable.AddRotateYOp(
            opSuffix="turntable"
        )

        num_frames = self.config["turntable_frames"]
        self.stage.SetStartTimeCode(1)
        self.stage.SetEndTimeCode(num_frames)
        rotate_op.Set(0.0, Usd.TimeCode(1))
        rotate_op.Set(360.0, Usd.TimeCode(num_frames))

    def add_hdri_variant_set(self, hdri_map):
        """USD VariantSet for pipeline-native HDRI switching."""
        dome_prim = self._dome_light.GetPrim()
        vset = dome_prim.GetVariantSets().AddVariantSet(
            "hdriEnvironment"
        )
        for name, path in hdri_map.items():
            vset.AddVariant(name)
            vset.SetVariantSelection(name)
            with vset.GetVariantEditContext():
                self._dome_light.GetTextureFileAttr().Set(path)` },
                { name: 'rig_controller.py', code:
`import json
import os

class RigController:
    """Bridge between Qt panel and Houdini LOP HDA.
    Drives HDA parms inside Houdini, or manipulates
    the USD stage directly when running standalone."""

    def __init__(self, hda_node_path=None):
        self._hda_node = None
        self._usd_builder = None

        if HOU_AVAILABLE and hda_node_path:
            self._hda_node = hou.node(hda_node_path)

    @classmethod
    def find_in_scene(cls):
        """Auto-detect the LookDev HDA in the scene."""
        for node in hou.node("/stage").allSubChildren():
            if node.type().name().startswith(
                "mg::lookdev_light_rig"
            ):
                return cls(hda_node_path=node.path())
        raise RuntimeError("No Look Dev Light Rig found.")

    def set_hdri(self, filepath):
        if self._hda_node:
            self._hda_node.parm("hdri_path").set(filepath)
        if self._usd_builder:
            self._usd_builder.set_hdri(filepath)

    def set_hdri_rotation(self, degrees):
        if self._hda_node:
            self._hda_node.parm("hdri_rotation").set(
                float(degrees)
            )

    def save_preset(self, preset_path):
        """Save current rig state to JSON."""
        state = self.get_state()
        os.makedirs(os.path.dirname(preset_path), exist_ok=True)
        with open(preset_path, "w") as f:
            json.dump(state, f, indent=2)

    def load_preset(self, preset_path):
        """Load a JSON preset and apply to the rig."""
        with open(preset_path, "r") as f:
            state = json.load(f)
        self.apply_state(state)

    def get_state(self):
        return {
            "hdri_path": self.get_hdri(),
            "hdri_rotation": self.get_hdri_rotation(),
            "hdri_exposure": self.get_hdri_exposure(),
            "hdri_tint": list(self.get_hdri_tint()),
            "turntable_frames": self.get_turntable_frames(),
            "cam_distance": self.get_camera_distance(),
        }` },
                { name: 'contact_sheet.py', code:
`import os
import math
import time

class ContactSheetGenerator:
    """Batch renders asset under every HDRI in the library
    and composites a labeled comparison grid image."""

    def __init__(self, rig_controller, library,
                 cell_size=(480, 270), columns=4):
        self.rig = rig_controller
        self.library = library
        self.cell_width, self.cell_height = cell_size
        self.columns = columns

    def generate(self, turntable_frame=None,
                 render_method="opengl",
                 progress_callback=None):
        entries = self.library.get_entries()
        if not entries:
            raise ValueError("No HDRIs found in library.")

        if turntable_frame is None:
            total = self.rig.get_turntable_frames()
            turntable_frame = int(total * 0.375)

        renders = []
        original_hdri = self.rig.get_hdri()

        try:
            for i, entry in enumerate(entries):
                if progress_callback:
                    progress_callback(
                        i, len(entries), entry.name
                    )
                self.rig.set_hdri(entry.filepath)

                render_path = os.path.join(
                    self.output_dir,
                    f"_contact_{i:03d}_{entry.name}.jpg"
                )
                self._render_frame(
                    render_path, render_method,
                    turntable_frame
                )
                renders.append({
                    "path": render_path,
                    "name": entry.name,
                })
        finally:
            self.rig.set_hdri(original_hdri)

        output_path = self._composite_grid(renders)
        return output_path` }
            ]
        },
        'houdini-tools': {
            context: 'Blur Studio',
            title: 'Houdini & Unreal Pipeline Tools',
            desc: 'HDAs, shelf tools, and in-engine integration built alongside artists for cinematic production at Blur Studio.',
            github: null,
            tabs: [
                { name: 'hda_builder.py', code:
`class HDABuilder:
    """Automates creation of Houdini Digital Assets
    with standardized parameters and UI layouts."""

    def __init__(self, hda_name, category="Custom"):
        self.hda_name = hda_name
        self.category = category
        self.parameters = []
        self.node_network = None

    def add_parameter(self, name, parm_type, default=None, 
                      label=None, range_min=None, range_max=None):
        """Register a parameter with type validation."""
        parm = {
            "name": name,
            "type": parm_type,
            "default": default,
            "label": label or name.replace("_", " ").title(),
            "range": (range_min, range_max)
        }
        self.parameters.append(parm)
        return self

    def build(self, target_node):
        """Compile the HDA definition and install it 
        into the current Houdini session."""
        definition = target_node.type().definition()
        template_group = definition.parmTemplateGroup()

        for parm in self.parameters:
            template = self._create_template(parm)
            template_group.append(template)

        definition.setParmTemplateGroup(template_group)
        return definition

    def _create_template(self, parm):
        import hou
        type_map = {
            "float": hou.FloatParmTemplate,
            "int": hou.IntParmTemplate,
            "toggle": hou.ToggleParmTemplate,
            "string": hou.StringParmTemplate,
            "color": hou.FloatParmTemplate,
        }
        factory = type_map.get(parm["type"], hou.FloatParmTemplate)
        num_components = 3 if parm["type"] == "color" else 1
        return factory(parm["name"], parm["label"], num_components)` },
                { name: 'shelf_tool.py', code:
`def create_scatter_tool():
    """Shelf tool: Scatter selected geo onto a surface
    with density controls and collision avoidance."""
    import hou

    selection = hou.selectedNodes()
    if not selection:
        hou.ui.displayMessage("Select a geometry node first.")
        return

    source = selection[0]
    parent = source.parent()

    scatter = parent.createNode("scatter", "controlled_scatter")
    scatter.setInput(0, source)
    scatter.parm("npts").set(500)

    attrib_noise = parent.createNode("attribnoise", "density_noise")
    attrib_noise.setInput(0, scatter)
    attrib_noise.parm("attribs").set("density")

    copy_to_points = parent.createNode("copytopoints", "instance_geo")
    copy_to_points.setInput(1, attrib_noise)

    parent.layoutChildren()
    copy_to_points.setDisplayFlag(True)
    copy_to_points.setRenderFlag(True)` }
            ]
        },
        'pipeline-automation': {
            context: 'The Picture Production Company',
            title: 'Pipeline & Media Automation',
            desc: 'Python tools for asset validation, media delivery, and cross-departmental pipeline automation.',
            github: null,
            tabs: [
                { name: 'asset_validator.py', code:
`class AssetValidator:
    """Validates media assets against delivery specifications
    before handoff to downstream departments."""

    VALID_CODECS = {"prores", "dnxhd", "h264", "exr"}
    VALID_FRAMERATES = {23.976, 24.0, 25.0, 29.97, 30.0}

    def __init__(self, spec_path):
        self.spec = self._load_spec(spec_path)
        self.errors = []
        self.warnings = []

    def validate(self, asset_path):
        """Run all validation checks on an asset."""
        self.errors.clear()
        self.warnings.clear()

        metadata = self._probe_media(asset_path)
        if not metadata:
            self.errors.append(f"Cannot read: {asset_path}")
            return False

        self._check_codec(metadata)
        self._check_resolution(metadata)
        self._check_framerate(metadata)
        self._check_colorspace(metadata)
        self._check_audio_channels(metadata)

        return len(self.errors) == 0

    def _check_resolution(self, meta):
        expected = self.spec.get("resolution")
        actual = (meta["width"], meta["height"])
        if expected and actual != tuple(expected):
            self.errors.append(
                f"Resolution mismatch: expected "
                f"{expected}, got {actual}"
            )

    def _check_framerate(self, meta):
        fps = meta.get("framerate", 0)
        if fps not in self.VALID_FRAMERATES:
            self.warnings.append(
                f"Non-standard framerate: {fps}"
            )` },
                { name: 'delivery_pipeline.py', code:
`class DeliveryPipeline:
    """Orchestrates file delivery from editorial
    to client-facing storage with logging."""

    def __init__(self, config):
        self.source = config["source_root"]
        self.dest = config["delivery_root"]
        self.manifest = []

    def process_batch(self, file_list):
        """Validate, transcode, and deliver a batch."""
        results = {"delivered": 0, "failed": 0, "skipped": 0}

        for filepath in file_list:
            validator = AssetValidator(self.spec_path)
            if not validator.validate(filepath):
                results["failed"] += 1
                self._log_errors(filepath, validator.errors)
                continue

            dest_path = self._compute_dest(filepath)
            if os.path.exists(dest_path):
                results["skipped"] += 1
                continue

            self._safe_copy(filepath, dest_path)
            self.manifest.append({
                "source": filepath,
                "dest": dest_path,
                "timestamp": datetime.now().isoformat()
            })
            results["delivered"] += 1

        self._write_manifest()
        return results` }
            ]
        },
        'shader-addon': {
            context: 'Personal · Open Source',
            title: 'Blender Shader Add-on',
            desc: 'Procedural toon and behavioral shader tools with conditional logic and a Blender UI panel.',
            github: 'https://github.com/muddwallprod14/shader-behavioral-tree-addon',
            tabs: [
                { name: 'behavioral_tree.py', code:
`import bpy

class ShaderBehaviorTree:
    """Builds a conditional shader graph using Blender's
    node system — selects materials based on object state."""

    def __init__(self, material_name="BehavioralShader"):
        self.mat = bpy.data.materials.new(material_name)
        self.mat.use_nodes = True
        self.tree = self.mat.node_tree
        self.tree.nodes.clear()
        self.output = self.tree.nodes.new("ShaderNodeOutputMaterial")

    def add_condition(self, label, threshold=0.5):
        """Add a conditional branch that switches shader
        paths based on an input value."""
        mix = self.tree.nodes.new("ShaderNodeMixShader")
        mix.label = label

        compare = self.tree.nodes.new("ShaderNodeMath")
        compare.operation = "GREATER_THAN"
        compare.inputs[1].default_value = threshold
        compare.label = f"{label}_condition"

        self.tree.links.new(compare.outputs[0], mix.inputs[0])
        return mix, compare

    def build_toon_branch(self):
        """Create a cel-shaded material path with
        quantized diffuse and rim lighting."""
        diffuse = self.tree.nodes.new("ShaderNodeBsdfDiffuse")
        ramp = self.tree.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].position = 0.3
        ramp.color_ramp.elements[1].position = 0.31

        shader_to_rgb = self.tree.nodes.new("ShaderNodeShaderToRGB")
        self.tree.links.new(diffuse.outputs[0], shader_to_rgb.inputs[0])
        self.tree.links.new(shader_to_rgb.outputs[0], ramp.inputs[0])
        return ramp` },
                { name: 'toon_shader.py', code:
`class ToonShaderBuilder:
    """Creates a complete cel/toon shader with edge
    detection, color banding, and specular highlights."""

    def __init__(self, mat_name="ToonMaterial"):
        self.mat = bpy.data.materials.new(mat_name)
        self.mat.use_nodes = True
        self.nodes = self.mat.node_tree.nodes
        self.links = self.mat.node_tree.links
        self.nodes.clear()

    def build(self, base_color=(0.8, 0.2, 0.2, 1.0),
              bands=3, rim_strength=0.7):
        """Assemble the full toon shader network."""
        output = self.nodes.new("ShaderNodeOutputMaterial")
        diffuse = self.nodes.new("ShaderNodeBsdfDiffuse")
        diffuse.inputs["Color"].default_value = base_color

        to_rgb = self.nodes.new("ShaderNodeShaderToRGB")
        self.links.new(diffuse.outputs[0], to_rgb.inputs[0])

        ramp = self.nodes.new("ShaderNodeValToRGB")
        self._setup_bands(ramp, bands)
        self.links.new(to_rgb.outputs[0], ramp.inputs[0])

        rim = self._build_rim_light(rim_strength)
        mix = self.nodes.new("ShaderNodeMixRGB")
        mix.blend_type = "ADD"
        self.links.new(ramp.outputs[0], mix.inputs[1])
        self.links.new(rim.outputs[0], mix.inputs[2])

        emission = self.nodes.new("ShaderNodeEmission")
        self.links.new(mix.outputs[0], emission.inputs[0])
        self.links.new(emission.outputs[0], output.inputs[0])

        return self.mat` }
            ]
        },
        'ttf-pipeline': {
            context: 'The Third Floor',
            title: 'Real-time Viz & Pipeline Support',
            desc: 'Workflow tooling and previs pipelines for real-time visualization and content delivery.',
            github: null,
            tabs: [
                { name: 'scene_publisher.py', code:
`class ScenePublisher:
    """Publishes previs scenes to the review pipeline
    with version control and dependency tracking."""

    def __init__(self, project_root, show_code):
        self.project_root = project_root
        self.show_code = show_code
        self.version_db = {}

    def publish(self, scene_path, department, notes=""):
        """Version up and publish a scene file."""
        version = self._next_version(scene_path)
        dest = self._build_publish_path(
            scene_path, department, version
        )

        dependencies = self._scan_dependencies(scene_path)
        self._copy_with_deps(scene_path, dest, dependencies)

        manifest = {
            "scene": scene_path,
            "published_to": dest,
            "version": version,
            "department": department,
            "dependencies": dependencies,
            "notes": notes,
            "timestamp": datetime.now().isoformat(),
            "user": os.getenv("USER", "unknown")
        }

        self._register_version(manifest)
        self._notify_downstream(manifest)
        return manifest

    def _scan_dependencies(self, scene_path):
        """Walk the scene graph to find referenced
        assets (textures, caches, rigs)."""
        deps = []
        with open(scene_path, 'r') as f:
            for line in f:
                if any(ext in line for ext in 
                       ['.abc', '.fbx', '.usd', '.exr']):
                    ref = self._extract_ref(line)
                    if ref and os.path.exists(ref):
                        deps.append(ref)
        return deps` }
            ]
        },
        'synoptic-rigger': {
            context: 'Personal · Open Source',
            title: 'Unreal Synoptic Rigger',
            desc: 'Character rigging suite for Unreal Engine — biped, quadruped, bird, and fish with FK/IK, Control Rig integration.',
            github: 'https://github.com/muddwallprod14/UnrealSynopticRigger',
            tabs: [
                { name: 'UnrealSynopticRigger.py', code:
`import unreal
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Tuple, Optional

class RigType(Enum):
    BIPED = "biped"
    QUADRUPED = "quadruped"
    BIRD = "bird"
    FISH = "fish"
    CUSTOM = "custom"

class ControlType(Enum):
    FK = "fk"
    IK = "ik"
    SPLINE = "spline"

@dataclass
class BoneInfo:
    name: str
    parent: Optional[str]
    position: Tuple[float, float, float]
    rotation: Tuple[float, float, float]
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    control_type: ControlType = ControlType.FK

class UnrealSynopticRigger:
    """Blur Studio-inspired rigging tool for Unreal Engine.
    Provides synoptic UI for FK/IK control across
    biped, quadruped, bird, and fish rigs."""

    def __init__(self):
        self.editor_util = unreal.EditorUtilityLibrary()
        self.current_rig = None
        self.rig_presets = {}
        self._load_rig_presets()

    def create_rig(self, rig_type, skeleton_asset):
        """Build a complete rig from a preset template."""
        preset = self.rig_presets.get(rig_type)
        if not preset:
            raise ValueError(f"Unknown rig type: {rig_type}")

        skeleton = self._load_skeleton(skeleton_asset)
        for bone in preset.bones:
            self._add_bone(skeleton, bone)

        for name, ctrl in preset.controls.items():
            self._create_control(skeleton, name, ctrl)

        self._apply_constraints(skeleton, preset.constraints)
        self._build_synoptic_ui(skeleton, preset)
        return skeleton` },
                { name: 'UnrealSynopticUI.py', code:
`class SynopticPanel:
    """Interactive UI panel that maps clickable body
    regions to rig controls — similar to Blur Studio's
    production synoptic interface."""

    def __init__(self, rig, theme="dark"):
        self.rig = rig
        self.theme = theme
        self.regions = {}
        self.selected_controls = []

    def build_panel(self, rig_type):
        """Generate the synoptic panel layout based
        on the rig type's bone hierarchy."""
        layout = self._get_layout_template(rig_type)

        for region_name, region_data in layout.items():
            self.regions[region_name] = {
                "bounds": region_data["bounds"],
                "controls": region_data["controls"],
                "color": self._theme_color(region_name),
                "hover_color": self._theme_hover(region_name),
            }

        return self.regions

    def on_click(self, x, y, modifier_keys=None):
        """Handle click on the synoptic panel — select
        the matching rig control(s)."""
        hit_region = self._hit_test(x, y)
        if not hit_region:
            return

        controls = self.regions[hit_region]["controls"]
        if modifier_keys and "shift" in modifier_keys:
            self.selected_controls.extend(controls)
        else:
            self.selected_controls = list(controls)

        self._select_in_viewport(self.selected_controls)
        self._highlight_region(hit_region)` }
            ]
        },
        'json-editor': {
            context: 'The Picture Production Company · Open Source',
            title: 'Flex JSON Config Editor',
            desc: 'Flask web app for editing pipeline JSON configs with MongoDB, SSH, and live file watching.',
            github: 'https://github.com/muddwallprod14/flex-json-editor',
            tabs: [
                { name: 'flex_json_editor_web.py', code:
`from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

app = Flask(__name__)
CORS(app)

data_cache = {
    'master': {'data': [], 'path': '', 'loaded': False},
    'farm': {'data': [], 'path': '', 'loaded': False}
}

class LogHandler(FileSystemEventHandler):
    """Watches log files for changes and triggers
    real-time updates to the web UI."""
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith('.log'):
            update_log_data()

def connect_to_mongodb():
    """Initialize MongoDB for persistent config storage."""
    global mongo_client, mongo_db, mongo_collection
    try:
        mongo_client = MongoClient(
            CONFIG['MONGO_CONNECTION_STRING'],
            serverSelectionTimeoutMS=5000
        )
        mongo_client.admin.command('ping')
        mongo_db = mongo_client[CONFIG['MONGO_DATABASE_NAME']]
        mongo_collection = mongo_db[CONFIG['MONGO_COLLECTION_NAME']]
        return True
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        return False

@app.route('/api/save', methods=['POST'])
def save_config():
    """Save edited JSON config with version tracking."""
    data = request.get_json()
    region = data.get('region', 'LA')
    config_data = data.get('config')

    backup = create_backup(region)
    write_config(region, config_data)

    if mongo_collection:
        mongo_collection.insert_one({
            'region': region,
            'backup_path': backup,
            'timestamp': datetime.now().isoformat(),
            'user': data.get('user', 'unknown')
        })

    return jsonify({"status": "saved", "backup": backup})` }
            ]
        },
        'watermarker': {
            context: 'Personal · Open Source',
            title: 'Video Watermarker',
            desc: 'PyQt5 desktop app for batch watermarking video files via FFmpeg with threaded processing.',
            github: 'https://github.com/muddwallprod14/watermarker-tool',
            tabs: [
                { name: 'watermarker.py', code:
`from PyQt5.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QPushButton,
    QLabel, QFileDialog, QComboBox, QSlider,
    QProgressBar, QListWidget, QGroupBox, QLineEdit
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal

class FFmpegWorker(QThread):
    """Background thread for FFmpeg watermark rendering
    with progress reporting and cancellation support."""
    progress = pyqtSignal(int)
    finished = pyqtSignal(str, bool)

    def __init__(self, input_file, output_file, 
                 watermark_text, position, opacity,
                 font_size, font_color):
        super().__init__()
        self.input_file = input_file
        self.output_file = output_file
        self.watermark_text = watermark_text
        self.position = position
        self.opacity = opacity
        self.font_size = font_size
        self.font_color = font_color
        self.cancelled = False

    def run(self):
        opacity_ff = float(self.opacity) / 100
        color_hex = self.font_color.name()[1:]

        position_map = {
            "Top-Left": "x=10:y=10",
            "Top-Right": "x=main_w-text_w-10:y=10",
            "Bottom-Left": "x=10:y=main_h-text_h-10",
            "Bottom-Right": "x=main_w-text_w-10:y=main_h-text_h-10",
            "Center": "x=(main_w-text_w)/2:y=(main_h-text_h)/2"
        }

        cmd = [
            'ffmpeg', '-i', self.input_file,
            '-vf',
            f"drawtext=text='{self.watermark_text}':"
            f"{position_map[self.position]}:"
            f"fontsize={self.font_size}:"
            f"fontcolor={color_hex}@{opacity_ff}",
            '-codec:a', 'copy', '-y',
            self.output_file
        ]

        process = subprocess.Popen(
            cmd, stderr=subprocess.PIPE,
            universal_newlines=True
        )

        while True:
            if self.cancelled:
                process.terminate()
                self.finished.emit(self.input_file, False)
                return
            line = process.stderr.readline()
            if not line and process.poll() is not None:
                break

        self.finished.emit(
            self.input_file, process.returncode == 0
        )` }
            ]
        },
        'uat-automation': {
            context: 'Personal · Open Source',
            title: 'UAT Automation CLI',
            desc: 'Terminal-based testing framework for VFX pipelines with asset validation and multi-format reporting.',
            github: 'https://github.com/muddwallprod14/uat-automation',
            tabs: [
                { name: 'uat_automation.py', code:
`from dataclasses import dataclass
from enum import Enum
from typing import Dict, List
from pathlib import Path
import hashlib, time

class TestStatus(Enum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class TestResult:
    name: str
    status: TestStatus
    duration: float
    message: str = ""
    details: Dict = None

class Validators:
    """Asset validation functions for VFX delivery."""

    @staticmethod
    def validate_file_integrity(path, expected_hash):
        """Verify file hasn't been corrupted via SHA-256."""
        start = time.time()
        sha = hashlib.sha256()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha.update(chunk)

        actual = sha.hexdigest()
        passed = actual == expected_hash
        return TestResult(
            name="File Integrity (SHA-256)",
            status=TestStatus.PASSED if passed 
                   else TestStatus.FAILED,
            duration=time.time() - start,
            message=f"Hash {'match' if passed else 'mismatch'}",
            details={
                "expected": expected_hash,
                "actual": actual
            }
        )

class TestRunner:
    """Executes test suites and collects results."""

    def __init__(self, logger):
        self.logger = logger
        self.results = []

    def run_suite(self, suite):
        self.logger.header(f"Running: {suite.name}")
        for test_def in suite.tests:
            result = self._execute_test(test_def)
            self.results.append(result)
            if result.status == TestStatus.PASSED:
                self.logger.success(result.name)
            else:
                self.logger.error(
                    f"{result.name}: {result.message}"
                )
        return self.results` }
            ]
        },
        'meshy-3d-generator': {
            context: 'Personal · Open Source',
            title: 'Meshy 3D Generator',
            desc: 'PyQt5 desktop app for AI-powered image-to-3D model generation — drag-and-drop input, Meshy AI API, threaded processing, multi-format export.',
            github: 'https://github.com/muddwallprod14/meshy-3d-generator',
            tabs: [
                { name: 'api_worker.py', code:
`class MeshyAPIWorker(QThread):
    """Background worker for Meshy API calls"""
    task_created = pyqtSignal(str)
    progress_updated = pyqtSignal(str, int, str)
    task_completed = pyqtSignal(str, dict)
    task_failed = pyqtSignal(str, str)
    log_message = pyqtSignal(str, str)

    def __init__(self, api_key, image_path, settings):
        super().__init__()
        self.api_key = api_key
        self.image_path = image_path
        self.settings = settings
        self.task_id = None
        self.running = True

    def run(self):
        try:
            self.log_message.emit(
                "INFO",
                f"Starting 3D generation for: "
                f"{os.path.basename(self.image_path)}"
            )
            task_id = self.create_task()
            if not task_id:
                return

            self.task_id = task_id
            self.task_created.emit(task_id)
            self.poll_task_status(task_id)
        except Exception as e:
            self.log_message.emit("ERROR", f"Error: {str(e)}")
            if self.task_id:
                self.task_failed.emit(self.task_id, str(e))

    def create_task(self):
        """Create an image-to-3D task via Meshy API"""
        url = "https://api.meshy.ai/v2/image-to-3d"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        with open(self.image_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        ext = Path(self.image_path).suffix.lower()
        mime_types = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp'
        }

        payload = {
            "image_url": f"data:{mime_types.get(ext, 'image/png')}"
                         f";base64,{image_data}",
            "enable_pbr": self.settings.get("enable_pbr", True),
            "ai_model": self.settings.get("ai_model", "meshy-4"),
            "topology": self.settings.get("topology", "quad"),
            "target_polycount": self.settings.get(
                "target_polycount", 30000
            )
        }

        response = requests.post(
            url, headers=headers, json=payload, timeout=60
        )
        response.raise_for_status()
        return response.json().get("result")

    def poll_task_status(self, task_id):
        """Poll task status until completion"""
        url = f"https://api.meshy.ai/v2/image-to-3d/{task_id}"
        headers = {"Authorization": f"Bearer {self.api_key}"}

        while self.running:
            response = requests.get(url, headers=headers, timeout=30)
            data = response.json()
            status = data.get("status", "UNKNOWN")
            progress = data.get("progress", 0)

            self.progress_updated.emit(task_id, progress, status)

            if status == "SUCCEEDED":
                self.task_completed.emit(task_id, data)
                return
            elif status in ("FAILED", "EXPIRED"):
                error = data.get("task_error", {}).get(
                    "message", status
                )
                self.task_failed.emit(task_id, error)
                return

            time.sleep(3)` },
                { name: 'image_drop.py', code:
`class ImageDropLabel(QLabel):
    """Custom label that accepts drag & drop images"""
    image_dropped = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAcceptDrops(True)
        self.setAlignment(Qt.AlignCenter)
        self.setMinimumSize(300, 300)
        self.setStyleSheet(\"\"\"
            QLabel {
                border: 2px dashed #555;
                border-radius: 12px;
                background: #1a1a1a;
                color: #888;
                font-size: 14px;
            }
            QLabel:hover {
                border-color: #0078d4;
                background: #1e1e1e;
            }
        \"\"\")
        self.setText("Drop image here\\nor click to browse")
        self.image_path = None

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self.setStyleSheet(
                self.styleSheet().replace("#555", "#0078d4")
            )

    def dragLeaveEvent(self, event):
        self.setStyleSheet(
            self.styleSheet().replace("#0078d4", "#555")
        )

    def dropEvent(self, event):
        self.setStyleSheet(
            self.styleSheet().replace("#0078d4", "#555")
        )
        urls = event.mimeData().urls()
        if urls:
            path = urls[0].toLocalFile()
            if path.lower().endswith(
                ('.png', '.jpg', '.jpeg', '.webp')
            ):
                self.set_image(path)
                self.image_dropped.emit(path)

    def set_image(self, path):
        self.image_path = path
        pixmap = QPixmap(path)
        scaled = pixmap.scaled(
            280, 280,
            Qt.KeepAspectRatio,
            Qt.SmoothTransformation
        )
        self.setPixmap(scaled)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            path, _ = QFileDialog.getOpenFileName(
                self, "Select Image", "",
                "Images (*.png *.jpg *.jpeg *.webp)"
            )
            if path:
                self.set_image(path)
                self.image_dropped.emit(path)` },
                { name: 'meshy_app.py', code:
`class Meshy3DGenerator(QMainWindow):
    def __init__(self):
        super().__init__()
        self.api_key = ""
        self.current_worker = None
        self.tasks = {}

        self.init_ui()
        self.load_settings()

    def start_generation(self):
        if not self.api_key or not self.image_drop.image_path:
            return

        self.generate_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)

        settings = {
            "ai_model": self.model_combo.currentText(),
            "topology": self.topology_combo.currentText(),
            "target_polycount": self.polycount_spin.value(),
            "enable_pbr": self.pbr_check.isChecked()
        }

        self.current_worker = MeshyAPIWorker(
            self.api_key,
            self.image_drop.image_path,
            settings
        )
        self.current_worker.task_created.connect(
            self.on_task_created
        )
        self.current_worker.progress_updated.connect(
            self.on_progress_updated
        )
        self.current_worker.task_completed.connect(
            self.on_task_completed
        )
        self.current_worker.task_failed.connect(
            self.on_task_failed
        )
        self.current_worker.start()

    def on_task_completed(self, task_id, data):
        self.progress_bar.setValue(100)
        self.status_label.setText("Complete!")
        self.generate_btn.setEnabled(True)

        if task_id in self.tasks:
            self.tasks[task_id].status = TaskStatus.SUCCEEDED
            self.tasks[task_id].model_url = (
                data.get("model_urls", {}).get("glb")
            )

        self.download_glb_btn.setEnabled(True)
        self.download_fbx_btn.setEnabled(True)
        self.download_obj_btn.setEnabled(True)

        item = QListWidgetItem(
            f"\\u2713 {os.path.basename("
            f"self.image_drop.image_path)} \\u2192 3D Model"
        )
        item.setData(Qt.UserRole, data)
        self.results_list.addItem(item)

    def download_model(self, fmt):
        selected = self.results_list.currentItem()
        if not selected:
            return

        data = selected.data(Qt.UserRole)
        url = data.get("model_urls", {}).get(fmt)
        if not url:
            return

        save_path, _ = QFileDialog.getSaveFileName(
            self, f"Save {fmt.upper()} File",
            f"model.{fmt}",
            f"{fmt.upper()} Files (*.{fmt})"
        )

        if save_path:
            response = requests.get(url, timeout=120)
            with open(save_path, "wb") as f:
                f.write(response.content)
            self.log(f"Saved to: {save_path}", "SUCCESS")` }
            ]
        }
    };

    let currentProject = null;

    function openModal(projectId) {
        const proj = PROJECTS[projectId];
        if (!proj) return;
        currentProject = proj;

        contextEl.textContent = proj.context;
        titleEl.textContent = proj.title;
        descEl.textContent = proj.desc;

        if (proj.github) {
            githubBtn.href = proj.github;
            githubBtn.style.display = 'inline-flex';
        } else {
            githubBtn.style.display = 'none';
        }

        tabsEl.innerHTML = '';
        proj.tabs.forEach(function (tab, i) {
            var btn = document.createElement('button');
            btn.className = 'code-modal-tab' + (i === 0 ? ' active' : '');
            btn.textContent = tab.name;
            btn.addEventListener('click', function () {
                showTab(i);
            });
            tabsEl.appendChild(btn);
        });

        showTab(0);
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function showTab(index) {
        if (!currentProject) return;
        var tabs = tabsEl.querySelectorAll('.code-modal-tab');
        tabs.forEach(function (t, i) {
            t.classList.toggle('active', i === index);
        });
        codeEl.textContent = currentProject.tabs[index].code;
    }

    function closeModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        currentProject = null;
    }

    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeModal();
        }
    });

    document.querySelectorAll('.project-card-preview').forEach(function (card) {
        card.addEventListener('click', function () {
            var projectId = card.getAttribute('data-project');
            openModal(projectId);
        });
    });
})();
