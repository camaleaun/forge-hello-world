// The same hello as ../../App.tsx, written by hand with Swift and AppKit.
import AppKit

let version = "0.1.0"
let help = """
Usage: hello-forge [option]

Options:
  --greet    Print the greeting
  --version  Print the version
  --help     Show this help
"""

// --- CLI: same flags as the forge version --------------------------------------------------------
// With arguments the program prints and exits; without (or with Finder's -psn_ argument) it opens the window.
let arguments = Array(CommandLine.arguments.dropFirst())
if let first = arguments.first, !(arguments.count == 1 && first.hasPrefix("-psn_")) {
    switch first {
    case "--greet": print("Hello, world!")
    case "--version": print(version)
    case "--help": print(help)
    default:
        FileHandle.standardError.write(Data("unknown option: \(first) (see --help)\n".utf8))
        exit(2)
    }
    exit(0)
}

// --- UI ------------------------------------------------------------------------------------------
final class AppDelegate: NSObject, NSApplicationDelegate {
    let label = NSTextField(labelWithString: "Press the button")
    var window: NSWindow!

    func applicationDidFinishLaunching(_ notification: Notification) {
        label.font = .systemFont(ofSize: 15)

        let button = NSButton(title: "Greet", target: self, action: #selector(greet))
        button.widthAnchor.constraint(equalToConstant: 100).isActive = true

        let stack = NSStackView(views: [label, button])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 12
        stack.edgeInsets = NSEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)

        // The style mask decides what the user can do: .resizable also enables the green maximize button,
        // and leaving it out would make the window a fixed size.
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 320, height: 120),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Hello, forge"
        window.contentMinSize = NSSize(width: 320, height: 120)
        window.contentView = stack
        window.center()  // without this the window opens at the bottom-left corner of the screen
        window.makeKeyAndOrderFront(nil)

        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Quit hello-forge", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let appMenuItem = NSMenuItem()
        appMenuItem.submenu = appMenu
        let mainMenu = NSMenu()
        mainMenu.addItem(appMenuItem)
        NSApp.mainMenu = mainMenu
        NSApp.activate(ignoringOtherApps: true)
    }

    @objc func greet() { label.stringValue = "Hello, world!" }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
