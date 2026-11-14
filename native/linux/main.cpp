// The same hello as ../../App.tsx, written by hand with C++ and GTK 4 (the Linux twin of ../macos/main.swift).
#define GDK_DISABLE_DEPRECATION_WARNINGS
#include <gtk/gtk.h>

#include <cstdio>
#include <cstring>

static const char* const kVersion = "0.1.0";
static const char* const kHelp = R"HELP(Usage: hello-forge [option]

Options:
  --greet    Print the greeting
  --version  Print the version
  --help     Show this help)HELP";

// --- UI ------------------------------------------------------------------------------------------
static void on_greet(GtkButton*, gpointer label) { gtk_label_set_text(GTK_LABEL(label), "Hello, world!"); }

static void on_quit(GSimpleAction*, GVariant*, gpointer app) { g_application_quit(G_APPLICATION(app)); }

static void on_activate(GtkApplication* app, gpointer) {
  // The label size comes from CSS; the text colour is left to the theme, so dark mode just works.
  GtkCssProvider* css = gtk_css_provider_new();
  const char* style = ".message { font-size: 15px; }";
#if GTK_CHECK_VERSION(4, 12, 0)
  gtk_css_provider_load_from_string(css, style);
#else
  gtk_css_provider_load_from_data(css, style, -1);
#endif
  gtk_style_context_add_provider_for_display(gdk_display_get_default(), GTK_STYLE_PROVIDER(css),
                                             GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
  g_object_unref(css);

  GtkWidget* label = gtk_label_new("Press the button");
  gtk_widget_add_css_class(label, "message");
  gtk_widget_set_halign(label, GTK_ALIGN_START);

  GtkWidget* button = gtk_button_new_with_label("Greet");
  gtk_widget_set_size_request(button, 100, -1);
  gtk_widget_set_halign(button, GTK_ALIGN_START);
  g_signal_connect(button, "clicked", G_CALLBACK(on_greet), label);

  GtkWidget* box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 12);
  gtk_widget_set_margin_top(box, 20);
  gtk_widget_set_margin_bottom(box, 20);
  gtk_widget_set_margin_start(box, 20);
  gtk_widget_set_margin_end(box, 20);
  gtk_widget_set_halign(box, GTK_ALIGN_START);
  gtk_box_append(GTK_BOX(box), label);
  gtk_box_append(GTK_BOX(box), button);

  // Resizable (the default); the size request on the content is the 320x120 minimum.
  GtkWidget* window = gtk_application_window_new(app);
  gtk_window_set_title(GTK_WINDOW(window), "Hello, forge");
  gtk_window_set_default_size(GTK_WINDOW(window), 320, 120);
  gtk_widget_set_size_request(window, 320, 120);
  gtk_window_set_child(GTK_WINDOW(window), box);

  // Ctrl+Q quits.
  static const GActionEntry entries[] = {{"quit", on_quit, nullptr, nullptr, nullptr, {0, 0, 0}}};
  g_action_map_add_action_entries(G_ACTION_MAP(app), entries, G_N_ELEMENTS(entries), app);
  const char* quit_keys[] = {"<Control>q", nullptr};
  gtk_application_set_accels_for_action(app, "app.quit", quit_keys);

  gtk_window_present(GTK_WINDOW(window));
}

int main(int argc, char** argv) {
  // --- CLI: same flags as the forge version, handled before GTK starts ---------------------------
  if (argc > 1) {
    const char* first = argv[1];
    if (std::strcmp(first, "--greet") == 0) std::puts("Hello, world!");
    else if (std::strcmp(first, "--version") == 0) std::puts(kVersion);
    else if (std::strcmp(first, "--help") == 0) std::puts(kHelp);
    else {
      std::fprintf(stderr, "unknown option: %s (see --help)\n", first);
      return 2;
    }
    return 0;
  }

  GtkApplication* app = gtk_application_new("local.native.hello_forge", G_APPLICATION_DEFAULT_FLAGS);
  g_signal_connect(app, "activate", G_CALLBACK(on_activate), nullptr);
  // 0, nullptr: GApplication must not parse argv (the CLI above already did).
  int status = g_application_run(G_APPLICATION(app), 0, nullptr);
  g_object_unref(app);
  return status;
}
