.class public Lcom/visage/protocole/Chrome;
.super Landroid/webkit/WebChromeClient;

# Caméra (getUserMedia) et choix d'une photo (input type=file) pour l'onglet Photos

.field private act:Lcom/visage/protocole/MainActivity;

.method public constructor <init>(Lcom/visage/protocole/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lcom/visage/protocole/Chrome;->act:Lcom/visage/protocole/MainActivity;
    return-void
.end method

.method public onPermissionRequest(Landroid/webkit/PermissionRequest;)V
    .registers 6
    iget-object v0, p0, Lcom/visage/protocole/Chrome;->act:Lcom/visage/protocole/MainActivity;
    const-string v1, "android.permission.CAMERA"
    invoke-virtual {v0, v1}, Lcom/visage/protocole/MainActivity;->checkSelfPermission(Ljava/lang/String;)I
    move-result v2
    if-nez v2, :ask
    invoke-virtual {p1}, Landroid/webkit/PermissionRequest;->getResources()[Ljava/lang/String;
    move-result-object v3
    invoke-virtual {p1, v3}, Landroid/webkit/PermissionRequest;->grant([Ljava/lang/String;)V
    return-void
    :ask
    iput-object p1, v0, Lcom/visage/protocole/MainActivity;->pending:Landroid/webkit/PermissionRequest;
    const/4 v2, 0x1
    new-array v3, v2, [Ljava/lang/String;
    const/4 v2, 0x0
    aput-object v1, v3, v2
    const/4 v2, 0x7
    invoke-virtual {v0, v3, v2}, Lcom/visage/protocole/MainActivity;->requestPermissions([Ljava/lang/String;I)V
    return-void
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 8
    iget-object v0, p0, Lcom/visage/protocole/Chrome;->act:Lcom/visage/protocole/MainActivity;
    iget-object v1, v0, Lcom/visage/protocole/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    if-eqz v1, :fresh
    const/4 v2, 0x0
    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :fresh
    iput-object p2, v0, Lcom/visage/protocole/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    :try_start
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v1
    const/16 v2, 0x8
    invoke-virtual {v0, v1, v2}, Lcom/visage/protocole/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :fail
    const/4 v1, 0x1
    return v1
    :fail
    const/4 v1, 0x0
    iput-object v1, v0, Lcom/visage/protocole/MainActivity;->fileCb:Landroid/webkit/ValueCallback;
    invoke-interface {p2, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    const/4 v1, 0x1
    return v1
.end method
