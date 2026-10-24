// Ghidra headless report script for the embedded Fantech HIDUsb32.dll.
//@category Fantech
import java.io.PrintWriter;
import java.io.File;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import ghidra.program.model.symbol.Symbol;
import ghidra.program.model.symbol.SymbolIterator;
import ghidra.program.model.symbol.RefType;
import ghidra.program.model.address.Address;

public class ExportEvidence extends GhidraScript {
    @Override
    public void run() throws Exception {
        File out = new File("C:/Users/Goolagoon/aria/analysis/ghidra/HIDUsb32-analysis.txt");
        PrintWriter w = new PrintWriter(out, "UTF-8");
        w.println("PROGRAM " + currentProgram.getName());
        w.println("FORMAT " + currentProgram.getExecutableFormat() + " IMAGEBASE " + currentProgram.getImageBase());
        w.println("\n=== SYMBOLS ===");
        SymbolIterator syms = currentProgram.getSymbolTable().getAllSymbols(true);
        while (syms.hasNext()) {
            Symbol s = syms.next();
            String n = s.getName();
            if (s.isExternal() || n.startsWith("Ordinal_") || n.startsWith("FUN_"))
                w.println(s.getAddress() + " " + s.getSymbolType() + " " + n + " external=" + s.isExternal());
        }
        w.println("\n=== FUNCTION MAP ===");
        FunctionIterator fs = currentProgram.getFunctionManager().getFunctions(true);
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        while (fs.hasNext()) {
            Function f = fs.next();
            w.println("\n--- " + f.getEntryPoint() + " " + f.getName() + " size=" + f.getBody().getNumAddresses() + " ---");
            String low = f.getName().toLowerCase();
            if (low.contains("battery") || low.contains("writecommand") || low.contains("protocol") || low.contains("config") || low.contains("flash") || low.contains("usbserver") || low.contains("data") || low.contains("hid") || low.contains("read") || low.contains("write") || low.contains("device")) {
                DecompileResults r = d.decompileFunction(f, 30, monitor);
                if (r != null && r.decompileCompleted() && r.getDecompiledFunction() != null)
                    w.println(r.getDecompiledFunction().getC());
                else w.println("[decompile failed: " + (r == null ? "null" : r.getErrorMessage()) + "]");
            }
        }
        d.dispose();
        w.close();
        println("Wrote " + out.getAbsolutePath());
    }
}
