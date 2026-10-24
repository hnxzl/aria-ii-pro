# @category Fantech
from java.io import PrintWriter
from java.io import File
from ghidra.app.decompiler import DecompInterface

out = File('C:/Users/Goolagoon/aria/analysis/ghidra/HIDUsb32-analysis.txt')
w = PrintWriter(out, 'UTF-8')
w.println('PROGRAM ' + currentProgram.getName())
w.println('FORMAT ' + currentProgram.getExecutableFormat() + ' IMAGEBASE ' + str(currentProgram.getImageBase()))
w.println('\n=== SYMBOLS ===')
it = currentProgram.getSymbolTable().getAllSymbols(True)
while it.hasNext():
    s = it.next()
    name = s.getName()
    if s.isExternal() or name.startswith('Ordinal_') or name.startswith('FUN_'):
        w.println(str(s.getAddress()) + ' ' + str(s.getSymbolType()) + ' ' + name + ' external=' + str(s.isExternal()))
w.println('\n=== FUNCTION MAP ===')
d = DecompInterface()
d.openProgram(currentProgram)
it = currentProgram.getFunctionManager().getFunctions(True)
while it.hasNext():
    f = it.next()
    w.println('\n--- ' + str(f.getEntryPoint()) + ' ' + f.getName() + ' size=' + str(f.getBody().getNumAddresses()) + ' ---')
    low = f.getName().lower()
    if any(x in low for x in ['battery','writecommand','protocol','config','flash','usbserver','data','hid','read','write','device']):
        r = d.decompileFunction(f, 30, monitor)
        if r is not None and r.decompileCompleted() and r.getDecompiledFunction() is not None:
            w.println(r.getDecompiledFunction().getC())
        else:
            w.println('[decompile failed: ' + ('null' if r is None else r.getErrorMessage()) + ']')
d.dispose()
w.close()
println('Wrote ' + out.getAbsolutePath())
