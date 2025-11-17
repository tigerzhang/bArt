import 'dart:math';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CanvasKit Prototype',
      theme: ThemeData.light(),
      home: const CanvasHome(),
    );
  }
}

class LayerModel {
  LayerModel({
    required this.id,
    required this.x,
    required this.y,
    required this.w,
    required this.h,
    required this.color,
    this.rotation = 0,
    this.locked = false,
  });

  final String id;
  double x;
  double y;
  double w;
  double h;
  Color color;
  double rotation;
  bool locked;
}

class CanvasHome extends StatefulWidget {
  const CanvasHome({Key? key}) : super(key: key);

  @override
  State<CanvasHome> createState() => _CanvasHomeState();
}

class _CanvasHomeState extends State<CanvasHome>
    with SingleTickerProviderStateMixin {
  final List<LayerModel> layers = [];

  double scale = 1.0;
  Offset pan = Offset.zero;

  // Selection / drag
  String? selectedId;
  String? draggingId;
  Offset lastFocalPoint = Offset.zero;
  Offset dragOffset = Offset.zero;

  // FPS counter
  int frames = 0;
  double lastFpsTime = 0;
  double fps = 0;

  // Painter cache invalidation
  int paintVersion = 0;

  @override
  void initState() {
    super.initState();
    _generateLayers(150);
    SchedulerBinding.instance.addPersistentFrameCallback(_onFrame);
  }

  void _onFrame(Duration timeStamp) {
    frames += 1;
    final tSeconds = timeStamp.inMilliseconds / 1000.0;
    if (lastFpsTime == 0) lastFpsTime = tSeconds;
    final dt = tSeconds - lastFpsTime;
    if (dt >= 1.0) {
      fps = frames / dt;
      frames = 0;
      lastFpsTime = tSeconds;
      setState(() {});
    }
    SchedulerBinding.instance.scheduleFrame();
  }

  void _generateLayers(int count) {
    final rand = Random(123);
    layers.clear();
    for (var i = 0; i < count; i++) {
      final x = rand.nextDouble() * 2000 - 500;
      final y = rand.nextDouble() * 2000 - 500;
      final w = 60 + rand.nextDouble() * 140;
      final h = 40 + rand.nextDouble() * 120;
      final color =
          HSVColor.fromAHSV(1, rand.nextDouble() * 360, 0.6, 0.9).toColor();
      layers.add(
          LayerModel(id: 'layer-$i', x: x, y: y, w: w, h: h, color: color));
    }
    paintVersion += 1;
  }

  // Convert global screen pos to world coord (accounting scale & pan)
  Offset _toWorld(Offset local) {
    return (local - pan) / scale;
  }

  LayerModel? _hitTest(Offset worldPos) {
    for (var i = layers.length - 1; i >= 0; i--) {
      final l = layers[i];
      final rect = Rect.fromLTWH(l.x, l.y, l.w, l.h);
      if (rect.contains(worldPos)) return l;
    }
    return null;
  }

  void _onScaleStart(ScaleStartDetails details) {
    lastFocalPoint = details.focalPoint;
    final world = _toWorld(details.focalPoint);
    final hit = _hitTest(world);
    setState(() {
      selectedId = hit?.id;
      draggingId = hit?.id;
      if (draggingId != null) {
        final l = layers.firstWhere((la) => la.id == draggingId);
        dragOffset = world - Offset(l.x, l.y);
      } else {
        dragOffset = Offset.zero;
      }
    });
  }

  void _onScaleUpdate(ScaleUpdateDetails details) {
    if (details.scale != 1.0) {
      // zoom centered on focal point
      final prevScale = scale;
      final newScale = (scale * details.scale).clamp(0.25, 4.0);
      final focal = details.focalPoint;
      final worldFocal = _toWorld(focal);

      setState(() {
        scale = newScale;
        // adjust pan to keep worldFocal under same screen point
        pan = focal - worldFocal * scale;
      });
      return;
    }

    // it's a pan, move either stage or dragging layer
    final delta = details.focalPoint - lastFocalPoint;
    lastFocalPoint = details.focalPoint;
    if (draggingId != null) {
      final l = layers.firstWhere((la) => la.id == draggingId);
      final wdelta = delta / scale;
      setState(() {
        l.x += wdelta.dx;
        l.y += wdelta.dy;
        paintVersion += 1;
      });
    } else {
      setState(() {
        pan += delta;
      });
    }
  }

  void _onScaleEnd(ScaleEndDetails details) {
    setState(() {
      draggingId = null;
    });
  }

  // Bring selected layer to top
  void _bringToTop(String id) {
    final idx = layers.indexWhere((l) => l.id == id);
    if (idx == -1) return;
    final item = layers.removeAt(idx);
    layers.add(item);
    paintVersion += 1;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('CanvasKit Prototype'),
        actions: [
          PopupMenuButton<int>(
            onSelected: (v) => setState(() => _generateLayers(v)),
            itemBuilder: (ctx) => [50, 150, 300, 800]
                .map((c) =>
                    PopupMenuItem<int>(value: c, child: Text('Regenerate: $c')))
                .toList(),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12.0),
              child: Center(
                  child: Text('Regenerate',
                      style: TextStyle(color: Colors.white))),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Center(child: Text('${fps.toStringAsFixed(0)} FPS')),
          )
        ],
      ),
      body: LayoutBuilder(builder: (context, constraints) {
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onScaleStart: _onScaleStart,
          onScaleUpdate: _onScaleUpdate,
          onScaleEnd: _onScaleEnd,
          child: Stack(children: [
            RepaintBoundary(
              child: CustomPaint(
                size: Size(constraints.maxWidth, constraints.maxHeight),
                painter: _CanvasPainter(
                  layers: layers,
                  scale: scale,
                  pan: pan,
                  selectedId: selectedId,
                  version: paintVersion,
                ),
              ),
            ),
            Positioned(
              top: 16,
              left: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(6.0),
                    decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(8.0)),
                    child: Text(
                        'Zoom: ${scale.toStringAsFixed(2)}\nLayers: ${layers.length}',
                        style: const TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            )
          ]),
        );
      }),
    );
  }
}

class _CanvasPainter extends CustomPainter {
  _CanvasPainter(
      {required this.layers,
      required this.scale,
      required this.pan,
      required this.selectedId,
      required this.version})
      : super();

  final List<LayerModel> layers;
  final double scale;
  final Offset pan;
  final String? selectedId;
  final int version; // used to trigger repaint

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.translate(pan.dx, pan.dy);
    canvas.scale(scale, scale);

    // background
    final bgPaint = Paint()..color = const Color(0xFFF7F7F9);
    canvas.drawRect(Rect.fromLTWH(-1000, -1000, 4000, 4000), bgPaint);

    // grid
    final gridPaint = Paint()..color = const Color(0xFFEDEDED);
    for (double x = -1000; x < 3000; x += 100) {
      canvas.drawLine(Offset(x, -1000), Offset(x, 3000), gridPaint);
    }
    for (double y = -1000; y < 3000; y += 100) {
      canvas.drawLine(Offset(-1000, y), Offset(3000, y), gridPaint);
    }

    for (var layer in layers) {
      final r = Rect.fromLTWH(layer.x, layer.y, layer.w, layer.h);
      final paint = Paint()..color = layer.color;
      canvas.save();
      canvas.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
      if (layer.rotation != 0) canvas.rotate(layer.rotation);
      canvas.translate(-(layer.x + layer.w / 2), -(layer.y + layer.h / 2));
      canvas.drawRRect(
          RRect.fromRectAndRadius(r, const Radius.circular(8.0)), paint);
      if (selectedId == layer.id) {
        final sp = Paint()
          ..color = Colors.blue.withOpacity(0.6)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3.0 / scale;
        canvas.drawRect(r.inflate(2 / scale), sp);
      }
      canvas.restore();
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _CanvasPainter oldDelegate) {
    return oldDelegate.version != version ||
        oldDelegate.scale != scale ||
        oldDelegate.pan != pan ||
        oldDelegate.selectedId != selectedId ||
        oldDelegate.layers.length != layers.length;
  }
}
